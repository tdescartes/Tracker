import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pantryApi, budgetApi, recipesApi, notificationsApi, insightsApi } from "../../src/lib/api";
import { HomeSkeleton } from "../../src/components/Skeleton";
import { useAuthStore } from "../../src/store/authStore";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { useState, useCallback } from "react";

export default function HomeScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const qc = useQueryClient();
    const now = new Date();
    const [refreshing, setRefreshing] = useState(false);

    const { data: expiring = [], isLoading: expiringLoading } = useQuery({
        queryKey: ["expiring"],
        queryFn: () => pantryApi.expiringSoon(3).then((r) => r.data),
    });

    const { data: budget, isLoading: budgetLoading } = useQuery({
        queryKey: ["budget", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });

    const { data: shopping = [] } = useQuery({
        queryKey: ["shopping-list"],
        queryFn: () => pantryApi.shoppingList().then((r) => r.data),
    });

    const { data: recipeData } = useQuery({
        queryKey: ["recipe-suggestions-home"],
        queryFn: () => recipesApi.suggestions(true, 3).then((r) => r.data),
        staleTime: 5 * 60_000,
    });

    const { data: notifData } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => notificationsApi.list(true).then((r) => r.data),
    });

    const { data: insightsData } = useQuery({
        queryKey: ["insights"],
        queryFn: () => insightsApi.list().then((r) => r.data),
        staleTime: 60_000,
    });

    const isLoading = expiringLoading || budgetLoading;

    const homeInsights = (insightsData ?? []).filter((i: any) => i.screen === "home" || i.screen === "budget").slice(0, 3);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await qc.invalidateQueries();
        setRefreshing(false);
    }, [qc]);

    const confirmed = parseFloat(budget?.confirmed_spent ?? "0");
    const estimated = parseFloat(budget?.estimated_spent ?? "0");
    const spent = parseFloat(budget?.total_spent ?? "0");
    const limit = parseFloat(budget?.budget_limit ?? "600");
    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const confirmedPct = limit > 0 ? Math.min((confirmed / limit) * 100, 100) : 0;
    const hasEstimated = estimated > 0;

    // Pace calculation
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const dailyPace = parseFloat(budget?.daily_pace ?? "0");
    const onTrack = budget?.on_track ?? true;
    const daysLeft = daysInMonth - dayOfMonth;
    const dailyBudget = daysLeft > 0 ? (limit - spent) / daysLeft : 0;

    const recipes: any[] = recipeData?.suggestions ?? [];
    const topRecipe = recipes[0];
    const unreadNotifs: number = notifData?.unread_count ?? 0;

    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = user?.full_name?.split(" ")[0] || "";

    // Compute action items count
    const actionCount = expiring.length + shopping.length + unreadNotifs;

    return (
        <ScrollView
            style={s.screen}
            contentContainerStyle={s.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006994" />}
        >
            <Text style={s.greeting}>{greeting}{firstName ? `, ${firstName}` : ""}!</Text>

            {isLoading && <HomeSkeleton />}

            {!isLoading && <>
                {/* ── Action Needed Card ──────────────────────────── */}
                {actionCount > 0 && (
                    <TouchableOpacity
                        style={s.actionCard}
                        onPress={() => {
                            if (expiring.length > 0) router.push("/(tabs)/pantry");
                            else router.push("/(tabs)/profile");
                        }}
                    >
                        <View style={s.actionHeader}>
                            <Text style={s.actionIcon}>⚡</Text>
                            <Text style={s.actionTitle}>Action Needed</Text>
                            <View style={s.actionBadge}>
                                <Text style={s.actionBadgeText}>{actionCount}</Text>
                            </View>
                        </View>
                        <View style={s.actionItems}>
                            {expiring.length > 0 && (
                                <Text style={s.actionItem}>
                                    🍎 {expiring.length} item{expiring.length !== 1 ? "s" : ""} expiring soon
                                </Text>
                            )}
                            {shopping.length > 0 && (
                                <Text style={s.actionItem}>
                                    🛒 {shopping.length} item{shopping.length !== 1 ? "s" : ""} on shopping list
                                </Text>
                            )}
                            {unreadNotifs > 0 && (
                                <Text style={s.actionItem}>
                                    🔔 {unreadNotifs} unread notification{unreadNotifs !== 1 ? "s" : ""}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* ── Budget Pulse Card ──────────────────────────── */}
                <TouchableOpacity style={s.budgetCard} onPress={() => router.push("/(tabs)/money")}>
                    <View style={s.budgetHeader}>
                        <Text style={s.budgetTitle}>Budget Pulse</Text>
                        <Text style={[s.budgetAmount, pct > 90 && { color: "#EC5800" }]}>
                            {hasEstimated ? "~" : ""}${spent.toFixed(0)} / ${limit.toFixed(0)}
                        </Text>
                    </View>
                    <View style={s.progressBg}>
                        <View style={{ flexDirection: "row", height: 10 }}>
                            <View style={[s.progressFill, {
                                width: `${confirmedPct}%` as any,
                                backgroundColor: pct > 90 ? "#EC5800" : pct > 70 ? "#f59e0b" : "#87A96B",
                                borderTopLeftRadius: 5,
                                borderBottomLeftRadius: 5,
                            }]} />
                            {hasEstimated && (
                                <View style={[s.progressFill, {
                                    width: `${Math.min((estimated / limit) * 100, pct - confirmedPct)}%` as any,
                                    backgroundColor: pct > 90 ? "#EC580066" : pct > 70 ? "#f59e0b66" : "#87A96B66",
                                }]} />
                            )}
                        </View>
                    </View>
                    <View style={s.budgetMeta}>
                        <Text style={s.budgetMetaText}>
                            {!onTrack ? "⚠️ " : ""}{pct.toFixed(0)}% used · {daysLeft} days left
                        </Text>
                        <Text style={[s.paceText, !onTrack && { color: "#EC5800" }]}>
                            {onTrack ? "✓" : "⚠"} ${dailyPace.toFixed(0)}/day
                        </Text>
                    </View>
                    {hasEstimated && (
                        <Text style={s.estimatedNote}>
                            Confirmed: ${confirmed.toFixed(0)} · Estimated: ~${estimated.toFixed(0)}
                        </Text>
                    )}
                    {dailyBudget > 0 && (
                        <Text style={s.dailyBudget}>
                            ${dailyBudget.toFixed(2)}/day remaining
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ── AI Insights ─────────────────────────────────── */}
                {homeInsights.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                        {homeInsights.map((insight: any, i: number) => (
                            <View key={i} style={[s.insightCard, {
                                backgroundColor: insight.type === "warning" ? "#fef2f2" : insight.type === "tip" ? "#eff6ff" : "#f9fafb",
                                borderColor: insight.type === "warning" ? "#fecaca" : insight.type === "tip" ? "#bfdbfe" : "#e5e7eb",
                            }]}>
                                <Text style={s.insightTitle}>
                                    {insight.type === "warning" ? "⚠️" : insight.type === "tip" ? "💡" : "ℹ️"} {insight.title}
                                </Text>
                                <Text style={s.insightBody}>{insight.body}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Tonight's Pick Card ────────────────────────── */}
                {topRecipe && (
                    <TouchableOpacity style={s.recipeCard} onPress={() => router.push("/(tabs)/recipes")}>
                        <Text style={s.recipeLabel}>🍽 Tonight's Pick</Text>
                        <Text style={s.recipeName}>{topRecipe.name}</Text>
                        <View style={s.recipeMetaRow}>
                            {topRecipe.time_minutes && (
                                <Text style={s.recipeMeta}>⏱ {topRecipe.time_minutes} min</Text>
                            )}
                            <Text style={[s.recipeMeta, { color: "#87A96B" }]}>
                                ✅ {topRecipe.matched_count}/{topRecipe.ingredients?.length ?? 0} in pantry
                            </Text>
                            <Text style={[s.recipeMeta, { color: "#006994", fontWeight: "700" }]}>
                                {topRecipe.match_score}% match
                            </Text>
                        </View>
                        {topRecipe.missing?.length > 0 && (
                            <View style={s.missingRow}>
                                {topRecipe.missing.slice(0, 3).map((m: string) => (
                                    <View key={m} style={s.missingBadge}>
                                        <Text style={s.missingText}>✗ {m}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* ── This Week Summary ──────────────────────────── */}
                <View style={s.weekCard}>
                    <Text style={s.weekTitle}>📊 This Week</Text>
                    <View style={s.weekGrid}>
                        <View style={s.weekStat}>
                            <Text style={s.weekStatValue}>{expiring.length}</Text>
                            <Text style={s.weekStatLabel}>Expiring</Text>
                        </View>
                        <View style={s.weekStat}>
                            <Text style={s.weekStatValue}>{shopping.length}</Text>
                            <Text style={s.weekStatLabel}>To Buy</Text>
                        </View>
                        <View style={s.weekStat}>
                            <Text style={s.weekStatValue}>${parseFloat(budget?.waste_cost ?? "0").toFixed(0)}</Text>
                            <Text style={s.weekStatLabel}>Wasted</Text>
                        </View>
                        <View style={s.weekStat}>
                            <Text style={s.weekStatValue}>{recipes.length}</Text>
                            <Text style={s.weekStatLabel}>Recipes</Text>
                        </View>
                    </View>
                </View>

                {/* ── Eat Me First ────────────────────────────────── */}
                {expiring.length > 0 && (
                    <>
                        <Text style={s.sectionTitle}>🍎 Eat Me First</Text>
                        {expiring.slice(0, 5).map((item: any) => {
                            const daysLeft = item.expiration_date
                                ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
                                : null;
                            return (
                                <View key={item.id} style={[s.expiryCard, {
                                    borderColor: daysLeft !== null && daysLeft <= 1 ? "#EC5800" : "#f59e0b",
                                }]}>
                                    <Text style={s.itemName}>{item.name}</Text>
                                    <Text style={s.itemSub}>
                                        {item.location} · {item.expiration_date ? format(new Date(item.expiration_date), "MMM d") : ""}
                                    </Text>
                                    {daysLeft !== null && (
                                        <Text style={[s.daysLeft, { color: daysLeft <= 1 ? "#EC5800" : "#b45309" }]}>
                                            {daysLeft <= 0 ? "Expired!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}
            </>}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16, paddingBottom: 32 },
    greeting: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 16 },

    // Action Needed
    actionCard: { backgroundColor: "#fffbeb", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#fde68a" },
    actionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    actionIcon: { fontSize: 18, marginRight: 8 },
    actionTitle: { fontSize: 15, fontWeight: "700", color: "#92400e", flex: 1 },
    actionBadge: { backgroundColor: "#f59e0b", borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
    actionBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    actionItems: { gap: 4 },
    actionItem: { fontSize: 13, color: "#78350f", lineHeight: 20 },

    // Budget Pulse
    budgetCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    budgetTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
    budgetAmount: { fontSize: 16, fontWeight: "700", color: "#111827" },
    progressBg: { height: 10, backgroundColor: "#e5e7eb", borderRadius: 5, overflow: "hidden" },
    progressFill: { height: 10, borderRadius: 5 },
    budgetMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
    budgetMetaText: { fontSize: 12, color: "#708090" },
    paceText: { fontSize: 12, fontWeight: "600", color: "#374151" },
    dailyBudget: { fontSize: 12, color: "#006994", fontWeight: "500", marginTop: 6 },

    // Tonight's Pick
    recipeCard: { backgroundColor: "#f0fdf4", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
    recipeLabel: { fontSize: 12, fontWeight: "600", color: "#166534", marginBottom: 6 },
    recipeName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
    recipeMetaRow: { flexDirection: "row", gap: 12 },
    recipeMeta: { fontSize: 12, color: "#6b7280" },
    missingRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    missingBadge: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#EC5800", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
    missingText: { fontSize: 11, color: "#EC5800" },

    // This Week
    weekCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
    weekTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 },
    weekGrid: { flexDirection: "row", justifyContent: "space-around" },
    weekStat: { alignItems: "center" },
    weekStatValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
    weekStatLabel: { fontSize: 11, color: "#708090", marginTop: 2 },

    // Eat Me First
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 10 },
    expiryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4 },
    itemName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    itemSub: { fontSize: 12, color: "#708090", marginTop: 2 },
    daysLeft: { fontSize: 12, fontWeight: "700", marginTop: 4 },

    // Insights
    insightCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
    insightTitle: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 2 },
    insightBody: { fontSize: 12, color: "#4b5563", lineHeight: 18 },

    // Estimated note
    estimatedNote: { fontSize: 11, color: "#708090", marginTop: 4 },
});
