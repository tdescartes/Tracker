import { useState } from "react";
import {
    View, Text, ScrollView, ActivityIndicator, StyleSheet,
    TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { budgetApi } from "../../src/lib/api";

export default function BudgetScreen() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["budget", year, month],
        queryFn: () => budgetApi.summary(year, month).then((r) => r.data),
    });

    const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const goBack = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };

    const goForward = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const spent = parseFloat(data?.total_spent || "0");
    const limit = parseFloat(data?.budget_limit || "600");
    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const over = spent > limit;
    const categories: any[] = data?.by_category ?? [];

    return (
        <ScrollView style={styles.container}>
            {/* Month Selector */}
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={goBack}><Text style={styles.arrow}>◀</Text></TouchableOpacity>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity onPress={goForward}><Text style={styles.arrow}>▶</Text></TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator color="#006994" style={{ marginTop: 40 }} />
            ) : (
                <>
                    {/* Summary Card */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Monthly Spending</Text>
                        <Text style={[styles.summaryAmount, over && { color: "#EC5800" }]}>
                            ${spent.toFixed(2)}
                        </Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${pct}%`, backgroundColor: over ? "#EC5800" : "#006994" },
                                ]}
                            />
                        </View>
                        <Text style={styles.limitText}>
                            of ${limit.toFixed(0)} budget ({pct.toFixed(0)}%)
                        </Text>
                        {over && (
                            <Text style={styles.overText}>
                                ⚠️ Over budget by ${(spent - limit).toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {/* Category Breakdown */}
                    <Text style={styles.sectionTitle}>By Category</Text>
                    {categories.length === 0 ? (
                        <Text style={styles.noData}>No transactions this month</Text>
                    ) : (
                        categories.map((cat: any) => {
                            const catPct = limit > 0
                                ? ((parseFloat(cat.total) / limit) * 100).toFixed(0)
                                : "0";
                            return (
                                <View key={cat.category} style={styles.catRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.catName}>{cat.category}</Text>
                                        <View style={styles.catBarTrack}>
                                            <View
                                                style={[
                                                    styles.catBarFill,
                                                    { width: `${Math.min(parseFloat(catPct), 100)}%` },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.catAmount}>${parseFloat(cat.total).toFixed(2)}</Text>
                                        <Text style={styles.catPct}>{catPct}%</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {/* Subscriptions if present */}
                    {data?.detected_subscriptions && data.detected_subscriptions.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recurring Subscriptions</Text>
                            {data.detected_subscriptions.map((sub: any, i: number) => (
                                <View key={i} style={styles.subRow}>
                                    <Text style={styles.subName}>{sub.description}</Text>
                                    <Text style={styles.subAmount}>${parseFloat(sub.amount).toFixed(2)}</Text>
                                </View>
                            ))}
                        </>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
    monthRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    arrow: { fontSize: 18, color: "#006994", paddingHorizontal: 8 },
    monthLabel: { fontSize: 16, fontWeight: "600", color: "#111827" },
    summaryCard: {
        backgroundColor: "#fff", borderRadius: 14, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    summaryLabel: { fontSize: 13, color: "#708090", marginBottom: 4 },
    summaryAmount: { fontSize: 28, fontWeight: "700", color: "#111827" },
    progressTrack: {
        height: 8, backgroundColor: "#e5e7eb", borderRadius: 99, marginTop: 12,
        overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 99 },
    limitText: { fontSize: 12, color: "#708090", marginTop: 6 },
    overText: { fontSize: 13, color: "#EC5800", fontWeight: "600", marginTop: 6 },
    sectionTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 10, marginTop: 4 },
    noData: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 20 },
    catRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
        borderRadius: 10, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    catName: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
    catBarTrack: {
        height: 5, backgroundColor: "#e5e7eb", borderRadius: 99, overflow: "hidden",
    },
    catBarFill: { height: "100%", backgroundColor: "#006994", borderRadius: 99 },
    catAmount: { fontSize: 14, fontWeight: "600", color: "#111827" },
    catPct: { fontSize: 11, color: "#708090", marginTop: 2 },
    subRow: {
        flexDirection: "row", justifyContent: "space-between",
        backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    subName: { fontSize: 14, color: "#374151" },
    subAmount: { fontSize: 14, fontWeight: "600", color: "#111827" },
});
