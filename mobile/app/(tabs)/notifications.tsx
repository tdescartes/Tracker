import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../../src/lib/api";

export default function NotificationsScreen() {
    const qc = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => notificationsApi.list().then((r) => r.data),
        refetchInterval: 60_000,
    });

    const markAll = useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const markOne = useMutation({
        mutationFn: (id: string) => notificationsApi.markRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const notifications: any[] = data?.notifications ?? [];
    const unread: number = data?.unread_count ?? 0;

    const typeIcon = (type: string) =>
        type === "alert" ? "🔴" : type === "warning" ? "🟡" : type === "success" ? "🟢" : "🔵";

    return (
        <View style={styles.container}>
            {unread > 0 && (
                <TouchableOpacity style={styles.markAllBtn} onPress={() => markAll.mutate()}>
                    <Text style={styles.markAllText}>Mark all as read ({unread})</Text>
                </TouchableOpacity>
            )}

            {isLoading ? (
                <ActivityIndicator color="#006994" style={{ marginTop: 40 }} />
            ) : notifications.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🔔</Text>
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptySub}>No notifications to show</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item: any) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => !item.is_read && markOne.mutate(item.id)}
                            style={[styles.card, !item.is_read && styles.unreadCard]}
                        >
                            <View style={styles.row}>
                                <Text style={styles.icon}>{typeIcon(item.type)}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title}>{item.title}</Text>
                                    <Text style={styles.body}>{item.body}</Text>
                                    <Text style={styles.date}>
                                        {new Date(item.created_at).toLocaleDateString("en-US", {
                                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
    markAllBtn: {
        backgroundColor: "#006994", borderRadius: 10, paddingVertical: 10,
        alignItems: "center", marginBottom: 12,
    },
    markAllText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    card: {
        backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    unreadCard: { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
    row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    icon: { fontSize: 16, marginTop: 2 },
    title: { fontSize: 14, fontWeight: "600", color: "#111827" },
    body: { fontSize: 13, color: "#6b7280", marginTop: 2, lineHeight: 18 },
    date: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
});
