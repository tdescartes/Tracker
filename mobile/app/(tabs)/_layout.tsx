import { useState, useRef, useEffect } from "react";
import {
    View, TouchableOpacity, StyleSheet, Platform,
    Modal, Text, TextInput, FlatList, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { chatApi } from "../../src/lib/api";

const TINT = "#006994";
const INACTIVE = "#9ca3af";

function CustomTabBar({ state, descriptors, navigation }: any) {
    const router = useRouter();
    const tabs = state.routes.filter((r: any) => {
        const opts = descriptors[r.key]?.options;
        return opts?.href !== null;
    });

    return (
        <View style={tb.bar}>
            {tabs.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === state.routes.indexOf(route);
                const iconName = options.tabBarIconName as keyof typeof Ionicons.glyphMap;

                // Insert FAB after 2nd visible tab (between Pantry and Money)
                const isFabSlot = index === 2;

                return (
                    <View key={route.key} style={tb.tabItem}>
                        {isFabSlot && (
                            <TouchableOpacity
                                style={tb.fab}
                                activeOpacity={0.8}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    router.push("/(tabs)/scan");
                                }}
                            >
                                <Ionicons name="scan" size={26} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={() => {
                                if (!isFocused) {
                                    Haptics.selectionAsync();
                                    navigation.navigate(route.name);
                                }
                            }}
                            style={tb.tab}
                        >
                            <Ionicons
                                name={iconName}
                                size={22}
                                color={isFocused ? TINT : INACTIVE}
                            />
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
}

const tb = StyleSheet.create({
    bar: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        paddingTop: 8,
        alignItems: "center",
        justifyContent: "space-around",
    },
    tabItem: { flexDirection: "row", alignItems: "center" },
    tab: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 4 },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: TINT,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -28,
        marginRight: 12,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
});

export default function TabsLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{
                    headerStyle: { backgroundColor: TINT },
                    headerTintColor: "#fff",
                    headerTitleStyle: { fontWeight: "700" },
                }}
            >
                {/* 4 visible tabs */}
                <Tabs.Screen
                    name="index"
                    options={{ title: "Home", tabBarIconName: "home" }}
                />
                <Tabs.Screen
                    name="pantry"
                    options={{ title: "Pantry", tabBarIconName: "nutrition" }}
                />
                <Tabs.Screen
                    name="money"
                    options={{ title: "Money", tabBarIconName: "wallet" }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{ title: "Profile", tabBarIconName: "person-circle" }}
                />

                {/* Hidden screens — still navigable via router.push() */}
                <Tabs.Screen name="scan" options={{ title: "Scan Receipt", href: null }} />
                <Tabs.Screen name="bank" options={{ title: "Bank", href: null }} />
                <Tabs.Screen name="budget" options={{ title: "Budget", href: null }} />
                <Tabs.Screen name="goals" options={{ title: "Goals", href: null }} />
                <Tabs.Screen name="shopping" options={{ title: "Shopping", href: null }} />
                <Tabs.Screen name="recipes" options={{ title: "Recipes", href: null }} />
                <Tabs.Screen name="notifications" options={{ title: "Notifications", href: null }} />
            </Tabs>
            <FloatingChat />
        </View>
    );
}


/* ─── Floating AI Chat ─── */
type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
    "How much did I spend this month?",
    "What's expiring soon?",
    "Can I afford a vacation?",
];

function FloatingChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef<FlatList>(null);

    const send = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || sending) return;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: msg }]);
        setSending(true);
        try {
            const { data } = await chatApi.send(msg);
            setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
        } catch {
            setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Try again." }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* FAB */}
            {!open && (
                <TouchableOpacity
                    style={cs.fab}
                    activeOpacity={0.85}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setOpen(true);
                    }}
                >
                    <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Chat modal */}
            <Modal visible={open} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={cs.overlay}
                >
                    <View style={cs.card}>
                        {/* Header */}
                        <View style={cs.header}>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                            <Text style={cs.headerTitle}>AI Assistant</Text>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={(_, i) => String(i)}
                            contentContainerStyle={cs.msgList}
                            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                            ListEmptyComponent={
                                <View style={cs.empty}>
                                    <Ionicons name="sparkles" size={28} color={TINT + "66"} />
                                    <Text style={cs.emptyTitle}>Ask me anything</Text>
                                    <Text style={cs.emptySubtitle}>About your spending, pantry, or goals</Text>
                                    <View style={cs.suggestions}>
                                        {SUGGESTIONS.map((s) => (
                                            <TouchableOpacity key={s} style={cs.chip} onPress={() => send(s)}>
                                                <Text style={cs.chipText}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={[cs.bubble, item.role === "user" ? cs.bubbleUser : cs.bubbleAi]}>
                                    <Text style={item.role === "user" ? cs.bubbleTextUser : cs.bubbleTextAi}>
                                        {item.text}
                                    </Text>
                                </View>
                            )}
                            ListFooterComponent={
                                sending ? (
                                    <View style={cs.typingRow}>
                                        <ActivityIndicator size="small" color={TINT} />
                                        <Text style={cs.typingText}>Thinking…</Text>
                                    </View>
                                ) : null
                            }
                        />

                        {/* Input */}
                        <View style={cs.inputRow}>
                            <TextInput
                                style={cs.input}
                                value={input}
                                onChangeText={setInput}
                                placeholder="Ask about spending, pantry, goals…"
                                placeholderTextColor="#9ca3af"
                                editable={!sending}
                                onSubmitEditing={() => send()}
                                returnKeyType="send"
                            />
                            <TouchableOpacity
                                style={[cs.sendBtn, (!input.trim() || sending) && cs.sendBtnDisabled]}
                                disabled={!input.trim() || sending}
                                onPress={() => send()}
                            >
                                <Ionicons name="send" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const cs = StyleSheet.create({
    fab: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 100 : 76,
        right: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: TINT,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        zIndex: 99,
    },
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    card: {
        height: "70%",
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: TINT,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerTitle: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 15 },
    msgList: { padding: 16, flexGrow: 1 },
    empty: { alignItems: "center", paddingTop: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
    suggestions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16, paddingHorizontal: 8 },
    chip: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    chipText: { fontSize: 12, color: "#6b7280" },
    bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    bubbleUser: { alignSelf: "flex-end", backgroundColor: TINT, borderBottomRightRadius: 4 },
    bubbleAi: { alignSelf: "flex-start", backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
    bubbleTextUser: { color: "#fff", fontSize: 14, lineHeight: 20 },
    bubbleTextAi: { color: "#1f2937", fontSize: 14, lineHeight: 20 },
    typingRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
    typingText: { color: "#9ca3af", fontSize: 13 },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
    },
    input: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: TINT, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { opacity: 0.4 },
});

