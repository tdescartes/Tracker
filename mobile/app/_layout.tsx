import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { enableScreens } from "react-native-screens";
import { useAuthStore } from "../src/store/authStore";
import { notificationsApi } from "../src/lib/api";
import { useHouseholdSync } from "../src/hooks/useHouseholdSync";

enableScreens(false);

const queryClient = new QueryClient();

// Configure foreground notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) return null; // Simulator — skip

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    // Android: create notification channel
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("tracker", {
            name: "Tracker Alerts",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#006994",
        });
    }

    const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
}

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <RootNavigator />
        </QueryClientProvider>
    );
}

function RootNavigator() {
    const { user, hydrate } = useAuthStore();
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    // Real-time household sync via WebSocket
    useHouseholdSync((user as any)?.household_id ?? null);

    useEffect(() => {
        hydrate();
    }, []);

    // Register for push notifications after login
    useEffect(() => {
        if (!user) return;

        registerForPushNotifications().then((token) => {
            if (token) {
                notificationsApi.registerToken(token, "expo").catch(() => {
                    // Non-fatal: user can still use the app without push
                });
            }
        });

        // Listen for notifications received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log("[Tracker] Notification received:", notification.request.content.title);
        });

        // Listen for notification taps
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as any;
            // Navigate to relevant screen on tap
            if (data?.screen === "pantry") {
                // Navigation handled by expo-router via linking
            }
        });

        return () => {
            notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
            responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, [user]);

    return <Slot />;
}

