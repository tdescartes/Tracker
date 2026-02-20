import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { pantryApi, budgetApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { format } from "date-fns";

export default function HomeScreen() {
    const { user } = useAuthStore();
    const now = new Date();

    const { data: expiring = [] } = useQuery({
        queryKey: ["expiring"],
        queryFn: () => pantryApi.expiringSoon(3).then((r) => r.data),
    });
    const { data: budget } = useQuery({
        queryKey: ["budget", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });

    const spent = parseFloat(budget?.total_spent ?? "0");
    const limit = 600;
    const pct = Math.min((spent / limit) * 100, 100);

    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    return (
        <ScrollView style={s.screen} contentContainerStyle={s.container}>
            <Text style={s.greeting}>{greeting}{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}!</Text>

            {/* Budget Meter */}
            <View style={s.card}>
                <Text style={s.cardTitle}>Monthly Budget</Text>
                <View style={s.row}>
                    <Text style={s.meterLabel}>Spent: <Text style={s.bold}>${spent.toFixed(2)}</Text></Text>
                    <Text style={s.meterLabel}>Limit: <Text style={s.bold}>${limit}</Text></Text>
                </View>
                <View style={s.meterBg}>
                    <View style={[s.meterFill, { width: `${pct}%` as any, backgroundColor: pct > 90 ? "#EC5800" : pct > 70 ? "#f59e0b" : "#87A96B" }]} />
                </View>
                <Text style={s.meterSub}>{pct.toFixed(0)}% used</Text>
            </View>

            {/* Eat Me First */}
            <Text style={s.sectionTitle}>🍎 Eat Me First</Text>
            {expiring.length === 0 ? (
                <View style={s.emptyBox}>
                    <Text style={s.emptyText}>No items expiring in the next 3 days. Great job!</Text>
                </View>
            ) : (
                expiring.map((item: any) => {
                    const daysLeft = item.expiration_date
                        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
                        : null;
                    return (
                        <View key={item.id} style={[s.expiryCard, { borderColor: daysLeft !== null && daysLeft <= 1 ? "#EC5800" : "#f59e0b" }]}>
                            <Text style={s.itemName}>{item.name}</Text>
                            <Text style={s.itemSub}>{item.location} · {item.expiration_date ? format(new Date(item.expiration_date), "MMM d") : ""}</Text>
                            {daysLeft !== null && (
                                <Text style={[s.daysLeft, { color: daysLeft <= 1 ? "#EC5800" : "#b45309" }]}>
                                    {daysLeft <= 0 ? "Expired!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                                </Text>
                            )}
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16 },
    greeting: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 16 },
    card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    meterLabel: { fontSize: 13, color: "#6b7280" },
    bold: { fontWeight: "700", color: "#111827" },
    meterBg: { height: 12, backgroundColor: "#e5e7eb", borderRadius: 6, overflow: "hidden" },
    meterFill: { height: 12, borderRadius: 6 },
    meterSub: { fontSize: 12, color: "#708090", marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 10 },
    emptyBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
    emptyText: { color: "#708090", fontSize: 13, textAlign: "center" },
    expiryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4 },
    itemName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    itemSub: { fontSize: 12, color: "#708090", marginTop: 2 },
    daysLeft: { fontSize: 12, fontWeight: "700", marginTop: 4 },
});
