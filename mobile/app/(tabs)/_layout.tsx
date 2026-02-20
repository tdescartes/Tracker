import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#006994",
                tabBarInactiveTintColor: "#708090",
                tabBarStyle: { borderTopColor: "#e5e7eb", paddingBottom: 4 },
                headerStyle: { backgroundColor: "#006994" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "700" },
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home" }} />
            <Tabs.Screen name="pantry" options={{ title: "Pantry", tabBarLabel: "Pantry" }} />
            <Tabs.Screen name="scan" options={{ title: "Scan Receipt", tabBarLabel: "Scan" }} />
            <Tabs.Screen name="recipes" options={{ title: "Recipe Ideas", tabBarLabel: "Recipes" }} />
            <Tabs.Screen name="shopping" options={{ title: "Shopping List", tabBarLabel: "Shopping" }} />
        </Tabs>
    );
}

