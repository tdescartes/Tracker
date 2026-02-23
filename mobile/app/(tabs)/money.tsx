import { useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, Alert, FlatList, RefreshControl,
    Dimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetApi, bankApi, goalsApi, insightsApi } from "../../src/lib/api";
import * as Haptics from "expo-haptics";

// ── Segment selector ─────────────────────────────────────────
type Segment = "Budget" | "Transactions" | "Goals";
const SEGMENTS: Segment[] = ["Budget", "Transactions", "Goals"];

const CATEGORY_COLORS: Record<string, string> = {
    Groceries: "#22c55e", Dining: "#f97316", Transport: "#3b82f6",
    Utilities: "#eab308", Entertainment: "#a855f7", Shopping: "#ec4899",
    Healthcare: "#ef4444", Subscriptions: "#6366f1", Income: "#10b981",
    Transfer: "#9ca3af", Other: "#6b7280",
};

export default function MoneyScreen() {
    const [segment, setSegment] = useState<Segment>("Budget");

    return (
        <View style={s.screen}>
            {/* Segmented Control */}
            <View style={s.segmentRow}>
                {SEGMENTS.map((seg) => (
                    <TouchableOpacity
                        key={seg}
                        style={[s.segBtn, segment === seg && s.segActive]}
                        onPress={() => { Haptics.selectionAsync(); setSegment(seg); }}
                    >
                        <Text style={[s.segText, segment === seg && s.segTextActive]}>{seg}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {segment === "Budget" && <BudgetSegment />}
            {segment === "Transactions" && <TransactionsSegment />}
            {segment === "Goals" && <GoalsSegment />}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
//  BUDGET SEGMENT
// ══════════════════════════════════════════════════════════════
function BudgetSegment() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const { data, isLoading } = useQuery({
        queryKey: ["budget", year, month],
        queryFn: () => budgetApi.summary(year, month).then((r) => r.data),
    });

    const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
        month: "long", year: "numeric",
    });

    const goBack = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
    const goForward = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

    const confirmed = parseFloat(data?.confirmed_spent || "0");
    const estimated = parseFloat(data?.estimated_spent || "0");
    const spent = parseFloat(data?.total_spent || "0");
    const limit = parseFloat(data?.budget_limit || "600");
    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const confirmedPct = limit > 0 ? Math.min((confirmed / limit) * 100, 100) : 0;
    const over = spent > limit;
    const hasEstimated = estimated > 0;
    const dailyPace = parseFloat(data?.daily_pace || "0");
    const onTrack = data?.on_track ?? true;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : daysInMonth;
    // Convert backend dict {"Produce": 45.00} → array [{category, total}]
    const categories = Object.entries(data?.by_category ?? {}).map(([category, total]) => ({
        category, total: parseFloat(String(total)),
    }));
    // Bank categories for combined view
    const bankCatEntries = Object.entries(data?.bank_category_breakdown ?? {}).map(([category, total]) => ({
        category: `${category} (bank)`, total: parseFloat(String(total)),
    }));
    const allCategories = [...categories, ...bankCatEntries].filter(c => c.total > 0);

    return (
        <ScrollView contentContainerStyle={s.pad}>
            {/* Month nav */}
            <View style={s.monthRow}>
                <TouchableOpacity onPress={goBack}><Text style={s.arrow}>◀</Text></TouchableOpacity>
                <Text style={s.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity onPress={goForward}><Text style={s.arrow}>▶</Text></TouchableOpacity>
            </View>

            {isLoading ? <ActivityIndicator color="#006994" style={{ marginTop: 40 }} /> : (
                <>
                    {/* Spending Card */}
                    <View style={s.card}>
                        <Text style={s.cardLabel}>Monthly Spending</Text>
                        <Text style={[s.cardAmount, over && { color: "#EC5800" }]}>
                            {hasEstimated ? "~" : ""}${spent.toFixed(2)}
                        </Text>
                        {/* Stacked progress bar */}
                        <View style={s.progressTrack}>
                            <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }}>
                                <View style={{ width: `${confirmedPct}%`, backgroundColor: over ? "#EC5800" : "#006994", height: 12 }} />
                                {hasEstimated && (
                                    <View style={{ width: `${Math.min((estimated / limit) * 100, pct - confirmedPct)}%`, backgroundColor: over ? "#EC580066" : "#00699466", height: 12 }} />
                                )}
                            </View>
                        </View>
                        <Text style={s.limitText}>of ${limit.toFixed(0)} budget ({pct.toFixed(0)}%)</Text>
                        {hasEstimated && (
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                                <Text style={{ fontSize: 11, color: "#708090" }}>
                                    Confirmed: ${confirmed.toFixed(0)}
                                </Text>
                                <Text style={{ fontSize: 11, color: "#708090" }}>
                                    Estimated: ~${estimated.toFixed(0)}
                                </Text>
                            </View>
                        )}
                        {over && <Text style={s.overText}>Over budget by ${(spent - limit).toFixed(2)}</Text>}

                        {/* Pace indicator */}
                        <View style={s.paceRow}>
                            <Text style={s.paceLabel}>{onTrack ? "✓ On track" : "⚠ Over pace"}</Text>
                            <Text style={[s.paceValue, !onTrack && { color: "#EC5800" }]}>
                                ${dailyPace.toFixed(0)}/day
                            </Text>
                        </View>

                        {/* Waste */}
                        {parseFloat(data?.waste_cost || "0") > 0 && (
                            <View style={[s.paceRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f3f4f6" }]}>
                                <Text style={s.paceLabel}>Food waste</Text>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#EC5800" }}>
                                    ${parseFloat(data.waste_cost).toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Category Breakdown */}
                    <Text style={s.sectionTitle}>By Category</Text>
                    {allCategories.length === 0 ? (
                        <Text style={s.noData}>No transactions this month</Text>
                    ) : (
                        allCategories.map((cat) => {
                            const catPct = limit > 0 ? ((cat.total / limit) * 100).toFixed(0) : "0";
                            const color = CATEGORY_COLORS[cat.category] || "#6b7280";
                            return (
                                <View key={cat.category} style={s.catRow}>
                                    <View style={[s.catDot, { backgroundColor: color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.catName}>{cat.category}</Text>
                                        <View style={s.catBarTrack}>
                                            <View style={[s.catBarFill, { width: `${Math.min(parseFloat(catPct), 100)}%`, backgroundColor: color }]} />
                                        </View>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={s.catAmount}>${cat.total.toFixed(2)}</Text>
                                        <Text style={s.catPct}>{catPct}%</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}



                    {/* Inflation Tracker */}
                    <InflationTracker />
                </>
            )}
        </ScrollView>
    );
}

// ══════════════════════════════════════════════════════════════
//  INFLATION TRACKER (mini-component for Budget segment)
// ══════════════════════════════════════════════════════════════
const SCREEN_W = Dimensions.get("window").width;

function InflationTracker() {
    const [searchItem, setSearchItem] = useState("");
    const [trackedItem, setTrackedItem] = useState("");

    const { data: priceHistory, isLoading } = useQuery({
        queryKey: ["inflation", trackedItem],
        queryFn: () => budgetApi.inflation(trackedItem).then((r) => r.data),
        enabled: trackedItem.length > 0,
    });

    const doSearch = () => {
        const q = searchItem.trim();
        if (!q) return;
        Haptics.selectionAsync();
        setTrackedItem(q);
    };

    const points: { date: string; avg_price: number }[] = priceHistory ?? [];
    const hasData = points.length >= 2;
    const priceChange = hasData ? points[points.length - 1].avg_price - points[0].avg_price : 0;
    const pctChange = hasData && points[0].avg_price > 0
        ? ((priceChange / points[0].avg_price) * 100).toFixed(1)
        : "0";

    return (
        <View style={{ marginTop: 24 }}>
            <Text style={s.sectionTitle}>Price Tracker</Text>
            <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
                Search an item to see its price history across your receipts
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="e.g. Milk, Eggs, Bread…"
                    placeholderTextColor="#9ca3af"
                    value={searchItem}
                    onChangeText={setSearchItem}
                    onSubmitEditing={doSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    onPress={doSearch}
                    style={{ backgroundColor: "#006994", paddingHorizontal: 16, borderRadius: 8, justifyContent: "center" }}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Track</Text>
                </TouchableOpacity>
            </View>

            {isLoading && <ActivityIndicator style={{ marginTop: 16 }} color="#006994" />}

            {trackedItem && !isLoading && points.length === 0 && (
                <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 16 }}>
                    No price data found for "{trackedItem}"
                </Text>
            )}

            {hasData && (
                <View style={[s.card, { marginTop: 12 }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", textTransform: "capitalize" }}>
                            {trackedItem}
                        </Text>
                        <Text style={{ fontWeight: "700", color: priceChange > 0 ? "#EC5800" : "#22c55e" }}>
                            {priceChange > 0 ? "▲" : "▼"} {pctChange}%
                        </Text>
                    </View>

                    {/* Simple sparkline using View bars */}
                    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 60, gap: 2 }}>
                        {(() => {
                            const maxP = Math.max(...points.map((p) => p.avg_price));
                            const minP = Math.min(...points.map((p) => p.avg_price));
                            const range = maxP - minP || 1;
                            return points.slice(-20).map((p, i) => {
                                const h = ((p.avg_price - minP) / range) * 50 + 10;
                                return (
                                    <View
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: h,
                                            backgroundColor: p.avg_price >= (points[0]?.avg_price ?? 0) ? "#EC5800" : "#22c55e",
                                            borderRadius: 2,
                                        }}
                                    />
                                );
                            });
                        })()}
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                            {points[0].date}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                            {points[points.length - 1].date}
                        </Text>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                        <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            First: ${points[0].avg_price.toFixed(2)}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            Latest: ${points[points.length - 1].avg_price.toFixed(2)}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
//  TRANSACTIONS SEGMENT
// ══════════════════════════════════════════════════════════════
function TransactionsSegment() {
    const qc = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [postUploadReport, setPostUploadReport] = useState<any>(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [refreshing, setRefreshing] = useState(false);

    const now = new Date();
    const { data: reportCard } = useQuery({
        queryKey: ["report-card", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.reportCard(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });

    const { data: transactions = [], refetch } = useQuery({
        queryKey: ["bank-transactions"],
        queryFn: () => bankApi.transactions().then((r) => r.data),
    });

    const reconcileMutation = useMutation({
        mutationFn: () => bankApi.reconcile().then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
            Alert.alert("Done", "Receipts matched with transactions.");
        },
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true); await refetch(); setRefreshing(false);
    }, [refetch]);

    const pickDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "text/csv"], copyToCacheDirectory: true,
            });
            if (res.canceled || !res.assets?.[0]) return;
            const file = res.assets[0];
            await doUpload(file.uri, file.mimeType || "application/pdf", file.name || "statement.pdf");
        } catch { Alert.alert("Error", "Could not pick document."); }
    };

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission required", "Photo library access is needed."); return; }
        const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
        if (picked.canceled || !picked.assets?.[0]) return;
        await doUpload(picked.assets[0].uri, "image/jpeg", "statement.jpg");
    };

    const doUpload = async (uri: string, mime: string, name: string) => {
        setUploading(true);
        try {
            const { data } = await bankApi.upload(uri, mime, name);
            setUploadResult(data);
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
            qc.invalidateQueries({ queryKey: ["report-card"] });
            // Auto-fetch report card after upload
            try {
                const now = new Date();
                const rc = await budgetApi.reportCard(now.getFullYear(), now.getMonth() + 1).then((r: any) => r.data);
                setPostUploadReport(rc);
            } catch { /* best-effort */ }
        } catch { Alert.alert("Error", "Could not process statement."); }
        finally { setUploading(false); }
    };

    const categories = [...new Set(transactions.map((t: any) => t.category || "Other"))] as string[];
    const filtered = categoryFilter === "all" ? transactions
        : transactions.filter((t: any) => (t.category || "Other") === categoryFilter);

    const totalExpenses = transactions.filter((t: any) => !t.is_income).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    const totalIncome = transactions.filter((t: any) => t.is_income).reduce((sum: number, t: any) => sum + t.amount, 0);
    const expenseTxs = transactions.filter((t: any) => !t.is_income);
    const matchedCount = transactions.filter((t: any) => t.linked_receipt_id).length;
    const unmatchedCount = expenseTxs.length - expenseTxs.filter((t: any) => t.linked_receipt_id).length;

    return (
        <ScrollView
            contentContainerStyle={s.pad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006994" />}
        >
            {/* Upload */}
            <Text style={s.sectionTitle}>Upload Statement</Text>
            {uploading ? (
                <View style={s.uploadBox}>
                    <ActivityIndicator size="large" color="#006994" />
                    <Text style={s.uploadingText}>AI is analyzing…</Text>
                </View>
            ) : (
                <View style={s.uploadRow}>
                    <TouchableOpacity style={s.uploadBtn} onPress={pickDocument}>
                        <Text style={s.uploadBtnIcon}>📄</Text>
                        <Text style={s.uploadBtnLabel}>PDF / CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.uploadBtn, s.uploadBtnAlt]} onPress={pickImage}>
                        <Text style={s.uploadBtnIcon}>📸</Text>
                        <Text style={[s.uploadBtnLabel, s.altLabel]}>Photo</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Upload result */}
            {uploadResult && (
                <View style={s.resultCard}>
                    <View style={s.resultHeader}>
                        <Text style={s.resultTitle}>✓ Import complete</Text>
                        {uploadResult.parsing_method && (
                            <View style={s.badge}><Text style={s.badgeText}>{uploadResult.parsing_method}</Text></View>
                        )}
                    </View>
                    <Text style={s.resultMeta}>
                        {uploadResult.transactions_imported} transactions
                        {uploadResult.bank_name ? ` from ${uploadResult.bank_name}` : ""}
                    </Text>
                    {uploadResult.subscriptions_found?.length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#f97316", marginBottom: 6 }}>
                                🔔 {uploadResult.subscriptions_found.length} subscriptions detected
                            </Text>
                            {uploadResult.subscriptions_found.map((sub: any, i: number) => (
                                <View key={i} style={s.subRow}>
                                    <Text style={s.subName}>{sub.description}</Text>
                                    <Text style={s.subAmount}>${Math.abs(sub.amount).toFixed(2)}/mo</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    <TouchableOpacity onPress={() => setUploadResult(null)} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                        <Text style={{ fontSize: 13, color: "#9ca3af" }}>Dismiss</Text>
                    </TouchableOpacity>

                    {/* Post-Upload Report Card Summary */}
                    {postUploadReport && (parseFloat(postUploadReport.income || 0) > 0 || parseFloat(postUploadReport.expenses || 0) > 0) && (
                        <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, marginTop: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 }}>📊 Monthly Report Card</Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                <View style={{ flex: 1, minWidth: "22%", backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8, alignItems: "center" }}>
                                    <Text style={{ fontSize: 10, color: "#708090" }}>Income</Text>
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#10b981" }}>${parseFloat(postUploadReport.income || 0).toFixed(0)}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: "22%", backgroundColor: "#f3f4f6", borderRadius: 8, padding: 8, alignItems: "center" }}>
                                    <Text style={{ fontSize: 10, color: "#708090" }}>Expenses</Text>
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>${parseFloat(postUploadReport.expenses || 0).toFixed(0)}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: "22%", backgroundColor: parseFloat(postUploadReport.net || 0) >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 8, padding: 8, alignItems: "center" }}>
                                    <Text style={{ fontSize: 10, color: "#708090" }}>Net</Text>
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: parseFloat(postUploadReport.net || 0) >= 0 ? "#10b981" : "#ef4444" }}>
                                        {parseFloat(postUploadReport.net || 0) >= 0 ? "+" : ""}${parseFloat(postUploadReport.net || 0).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                            {parseFloat(postUploadReport.surplus || 0) > 0 && (
                                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8, marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#166534" }}>
                                        💰 Surplus: ${parseFloat(postUploadReport.surplus).toLocaleString()} — move it to a savings goal!
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* Monthly Report Card */}
            {reportCard && (reportCard.income > 0 || reportCard.expenses > 0) && (
                <View style={[s.card, { marginBottom: 16 }]}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                        📊 Monthly Report Card
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: "#708090" }}>Income</Text>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#10b981" }}>${parseFloat(reportCard.income || 0).toFixed(0)}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: "#708090" }}>Expenses</Text>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#ef4444" }}>${parseFloat(reportCard.expenses || 0).toFixed(0)}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: "45%", backgroundColor: reportCard.net >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 10, padding: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: "#708090" }}>Net</Text>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: reportCard.net >= 0 ? "#10b981" : "#ef4444" }}>
                                {reportCard.net >= 0 ? "+" : ""}${parseFloat(reportCard.net || 0).toFixed(0)}
                            </Text>
                        </View>
                        {reportCard.vs_last_month_pct !== null && reportCard.vs_last_month_pct !== undefined && (
                            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#f5f3ff", borderRadius: 10, padding: 10, alignItems: "center" }}>
                                <Text style={{ fontSize: 11, color: "#708090" }}>vs Last Month</Text>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: reportCard.vs_last_month_pct > 0 ? "#EC5800" : "#10b981" }}>
                                    {reportCard.vs_last_month_pct > 0 ? "▲" : "▼"}{Math.abs(reportCard.vs_last_month_pct).toFixed(0)}%
                                </Text>
                            </View>
                        )}
                    </View>
                    {reportCard.biggest_increase_category && (
                        <View style={{ backgroundColor: "#fef3c7", borderRadius: 8, padding: 8, marginTop: 10 }}>
                            <Text style={{ fontSize: 12, color: "#92400e" }}>
                                ⚠️ {reportCard.biggest_increase_category} up ${parseFloat(reportCard.biggest_increase_amount || 0).toFixed(0)} vs last month
                            </Text>
                        </View>
                    )}
                    {reportCard.subscriptions?.length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366f1", marginBottom: 4 }}>
                                🔁 {reportCard.subscriptions.length} subscriptions · ${parseFloat(reportCard.subscription_monthly_total || 0).toFixed(0)}/mo
                            </Text>
                            <Text style={{ fontSize: 11, color: "#708090" }}>
                                Annual: ~${parseFloat(reportCard.subscription_annual_total || 0).toFixed(0)}
                            </Text>
                        </View>
                    )}
                    {/* Surplus indicator */}
                    {parseFloat(reportCard.surplus || 0) > 0 && (
                        <View style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 10 }}>
                            <Text style={{ fontSize: 13, color: "#166534" }}>
                                💡 Surplus: ${parseFloat(reportCard.surplus).toLocaleString()} available for savings goals.
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {transactions.length > 0 && (
                <>
                    {/* Summary */}
                    <View style={s.summaryRow}>
                        <View style={s.summaryCard}>
                            <Text style={s.summaryLabel}>Expenses</Text>
                            <Text style={[s.summaryValue, { color: "#ef4444" }]}>${totalExpenses.toFixed(2)}</Text>
                        </View>
                        <View style={s.summaryCard}>
                            <Text style={s.summaryLabel}>Income</Text>
                            <Text style={[s.summaryValue, { color: "#10b981" }]}>${totalIncome.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Matched/Unmatched summary */}
                    {expenseTxs.length > 0 && (
                        <View style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981" }} />
                                <Text style={{ fontSize: 13, color: "#374151" }}>{matchedCount} matched</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#d1d5db" }} />
                                <Text style={{ fontSize: 13, color: "#374151" }}>{unmatchedCount} unmatched</Text>
                            </View>
                            {unmatchedCount > 0 && (
                                <Text style={{ fontSize: 11, color: "#2563eb", flex: 1, textAlign: "right" }}>
                                    Scan receipts to match
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Category Filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
                        <TouchableOpacity
                            style={[s.pill, categoryFilter === "all" && s.pillActive]}
                            onPress={() => setCategoryFilter("all")}
                        >
                            <Text style={[s.pillText, categoryFilter === "all" && s.pillTextActive]}>All</Text>
                        </TouchableOpacity>
                        {categories.sort().map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[s.pill, categoryFilter === c && s.pillActive]}
                                onPress={() => setCategoryFilter(c)}
                            >
                                <View style={[s.pillDot, { backgroundColor: CATEGORY_COLORS[c] || "#6b7280" }]} />
                                <Text style={[s.pillText, categoryFilter === c && s.pillTextActive]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Reconcile */}
                    <TouchableOpacity
                        style={s.reconcileBtn}
                        onPress={() => reconcileMutation.mutate()}
                        disabled={reconcileMutation.isPending}
                    >
                        <Text style={s.reconcileText}>
                            {reconcileMutation.isPending ? "Matching…" : "🔄 Match with Receipts"}
                        </Text>
                    </TouchableOpacity>

                    {/* Transaction list */}
                    {filtered.map((tx: any) => {
                        const cat = tx.category || "Other";
                        const color = CATEGORY_COLORS[cat] || "#6b7280";
                        return (
                            <View key={tx.id} style={s.txRow}>
                                <View style={[s.txDot, { backgroundColor: color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                                    <View style={s.txMeta}>
                                        <Text style={s.txDate}>{tx.date}</Text>
                                        <View style={[s.txCatBadge, { backgroundColor: color + "20" }]}>
                                            <Text style={[s.txCatText, { color }]}>{cat}</Text>
                                        </View>
                                        {tx.is_subscription && (
                                            <View style={{ backgroundColor: "#fff7ed", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 10, color: "#f97316", fontWeight: "600" }}>recurring</Text>
                                            </View>
                                        )}
                                        {tx.linked_receipt_id && (
                                            <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "600" }}>✓ matched</Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={[s.txAmt, tx.is_income && { color: "#10b981" }]}>
                                    {tx.is_income ? "+" : ""}{tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                </Text>
                            </View>
                        );
                    })}
                </>
            )}

            {transactions.length === 0 && !uploading && !uploadResult && (
                <View style={s.emptyState}>
                    <Text style={s.emptyIcon}>🏦</Text>
                    <Text style={s.emptyTitle}>No transactions yet</Text>
                    <Text style={s.emptySub}>Upload a bank statement above to get started</Text>
                </View>
            )}
        </ScrollView>
    );
}

// ══════════════════════════════════════════════════════════════
//  GOALS SEGMENT
// ══════════════════════════════════════════════════════════════
function GoalsSegment() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const now = new Date();
    const { data: surplus } = useQuery({
        queryKey: ["surplus", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.surplus(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });
    const monthlySurplus = parseFloat(surplus?.surplus || "0");

    const { data: goals = [], isLoading, refetch } = useQuery({
        queryKey: ["goals"],
        queryFn: () => goalsApi.list().then((r) => r.data),
    });

    const deleteGoal = useMutation({
        mutationFn: (id: string) => goalsApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    });

    const updateGoal = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) => goalsApi.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    });

    return (
        <ScrollView contentContainerStyle={s.pad}>
            <TouchableOpacity style={s.addGoalBtn} onPress={() => setShowForm(true)}>
                <Text style={s.addGoalText}>＋ New Goal</Text>
            </TouchableOpacity>

            {showForm && <AddGoalForm onClose={() => setShowForm(false)} />}

            {/* Surplus banner */}
            {monthlySurplus > 0 && (
                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#166534" }}>
                        💰 ~${monthlySurplus.toFixed(0)}/mo surplus available
                    </Text>
                    <Text style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                        Income ${parseFloat(surplus?.income || "0").toFixed(0)} − Expenses ${parseFloat(surplus?.total_expenses || "0").toFixed(0)}
                    </Text>
                    {surplus?.top_cuttable?.[0] && (
                        <Text style={{ fontSize: 11, color: "#708090", marginTop: 4 }}>
                            💡 Cut ${surplus.top_cuttable[0].category}: save ~${parseFloat(surplus.top_cuttable[0].amount).toFixed(0)}/mo more
                        </Text>
                    )}
                    {/* One-tap move surplus to goal */}
                    {goals.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                            {goals.map((g: any) => {
                                const remaining = parseFloat(g.target_amount) - parseFloat(g.saved_amount);
                                if (remaining <= 0) return null;
                                const moveAmt = Math.min(monthlySurplus, remaining);
                                return (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={{ backgroundColor: "#16a34a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 4 }}
                                        onPress={() => {
                                            updateGoal.mutate({ id: g.id, data: { saved_amount: parseFloat(g.saved_amount) + moveAmt } });
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                                            Move ${moveAmt.toFixed(0)} → {g.goal_name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}

            {isLoading ? <ActivityIndicator color="#006994" style={{ marginTop: 40 }} /> :
                goals.length === 0 ? (
                    <View style={s.emptyState}>
                        <Text style={s.emptyIcon}>🎯</Text>
                        <Text style={s.emptyTitle}>No goals yet</Text>
                        <Text style={s.emptySub}>Create a savings goal to start planning</Text>
                    </View>
                ) : (
                    goals.map((goal: any) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            monthlySurplus={monthlySurplus}
                            onDelete={() => Alert.alert("Delete Goal", `Delete "${goal.goal_name}"?`, [
                                { text: "Cancel", style: "cancel" },
                                { text: "Delete", style: "destructive", onPress: () => deleteGoal.mutate(goal.id) },
                            ])}
                            onUpdate={(data) => updateGoal.mutate({ id: goal.id, data })}
                        />
                    ))
                )
            }
        </ScrollView>
    );
}

// ── Sub-components ───────────────────────────────────────────
function AddGoalForm({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [target, setTarget] = useState("");
    const [saved, setSaved] = useState("0");
    const [monthly, setMonthly] = useState("300");

    const create = useMutation({
        mutationFn: (data: object) => goalsApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); onClose(); },
    });

    const submit = () => {
        if (!name || !target) return;
        create.mutate({
            goal_name: name, target_amount: parseFloat(target),
            saved_amount: parseFloat(saved || "0"), monthly_contribution: parseFloat(monthly || "0"),
        });
    };

    return (
        <View style={s.formCard}>
            <Text style={s.formTitle}>Add New Goal</Text>
            <TextInput style={s.input} placeholder="Goal name" value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Target $" value={target} onChangeText={setTarget} keyboardType="numeric" />
            <TextInput style={s.input} placeholder="Already saved $" value={saved} onChangeText={setSaved} keyboardType="numeric" />
            <TextInput style={s.input} placeholder="Monthly savings $" value={monthly} onChangeText={setMonthly} keyboardType="numeric" />
            <View style={s.formBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                    <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={submit} disabled={create.isPending}>
                    <Text style={s.saveText}>{create.isPending ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function GoalCard({ goal, onDelete, onUpdate, monthlySurplus = 0 }: { goal: any; onDelete: () => void; onUpdate: (d: object) => void; monthlySurplus?: number }) {
    const pct = Math.min((parseFloat(goal.saved_amount) / parseFloat(goal.target_amount)) * 100, 100);
    const [logAmt, setLogAmt] = useState("");
    const [showLog, setShowLog] = useState(false);

    const remaining = parseFloat(goal.target_amount) - parseFloat(goal.saved_amount);
    const surplusMonths = monthlySurplus > 0 && remaining > 0 ? Math.ceil(remaining / monthlySurplus) : 0;
    const surplusDate = surplusMonths > 0 ? new Date(new Date().setMonth(new Date().getMonth() + surplusMonths)) : null;

    const handleLog = () => {
        const amount = parseFloat(logAmt);
        if (!amount || amount <= 0) return;
        onUpdate({ saved_amount: parseFloat(goal.saved_amount || "0") + amount });
        setLogAmt(""); setShowLog(false);
    };

    return (
        <View style={s.goalCard}>
            <View style={s.goalHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={s.goalName}>{goal.goal_name}</Text>
                    <Text style={s.goalTarget}>Target: ${parseFloat(goal.target_amount).toLocaleString()}</Text>
                </View>
                <TouchableOpacity onPress={onDelete}><Text style={{ fontSize: 18 }}>🗑</Text></TouchableOpacity>
            </View>
            <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: "#87A96B" }]} />
            </View>
            <Text style={s.progressText}>${parseFloat(goal.saved_amount).toLocaleString()} saved · {pct.toFixed(0)}%</Text>

            {showLog ? (
                <View style={s.logRow}>
                    <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Amount" keyboardType="numeric" value={logAmt} onChangeText={setLogAmt} />
                    <TouchableOpacity style={s.logBtn} onPress={handleLog}>
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowLog(false)}>
                        <Text style={{ color: "#708090", fontSize: 16, paddingLeft: 8 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={() => setShowLog(true)} style={{ marginTop: 4 }}>
                    <Text style={s.logLink}>💰 Log Savings</Text>
                </TouchableOpacity>
            )}

            {goal.months_to_goal && (
                <Text style={s.infoText}>
                    📅 {goal.months_to_goal} months to goal
                    {goal.estimated_completion ? ` (${new Date(goal.estimated_completion).toLocaleDateString("en-US", { month: "short", year: "numeric" })})` : ""}
                </Text>
            )}
            {goal.insight && (
                <View style={s.insightBox}><Text style={s.insightText}>{goal.insight}</Text></View>
            )}

            {surplusDate && remaining > 0 && (
                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: "#166534" }}>
                        💰 With ~${monthlySurplus.toFixed(0)}/mo surplus: reach goal by {surplusDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </Text>
                </View>
            )}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    pad: { padding: 16, paddingBottom: 40 },

    // Segment control
    segmentRow: { flexDirection: "row", margin: 12, backgroundColor: "#e5e7eb", borderRadius: 10, padding: 3 },
    segBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
    segActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    segText: { fontSize: 13, fontWeight: "600", color: "#708090" },
    segTextActive: { color: "#006994" },

    // Shared
    sectionTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 10, marginTop: 8 },
    card: { backgroundColor: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
    cardLabel: { fontSize: 13, color: "#708090", marginBottom: 4 },
    cardAmount: { fontSize: 28, fontWeight: "700", color: "#111827" },
    noData: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 20 },

    // Month nav
    monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
    arrow: { fontSize: 18, color: "#006994", paddingHorizontal: 8 },
    monthLabel: { fontSize: 16, fontWeight: "600", color: "#111827" },

    // Progress
    progressTrack: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 99, marginTop: 12, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 99 },
    limitText: { fontSize: 12, color: "#708090", marginTop: 6 },
    overText: { fontSize: 13, color: "#EC5800", fontWeight: "600", marginTop: 6 },
    progressText: { fontSize: 12, color: "#708090", marginTop: 4 },

    // Pace
    paceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
    paceLabel: { fontSize: 13, color: "#708090" },
    paceValue: { fontSize: 15, fontWeight: "700", color: "#111827" },

    // Category
    catRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    catName: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
    catBarTrack: { height: 5, backgroundColor: "#e5e7eb", borderRadius: 99, overflow: "hidden" },
    catBarFill: { height: "100%", borderRadius: 99 },
    catAmount: { fontSize: 14, fontWeight: "600", color: "#111827" },
    catPct: { fontSize: 11, color: "#708090", marginTop: 2 },
    subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    subName: { fontSize: 13, color: "#374151" },
    subAmount: { fontSize: 13, fontWeight: "600", color: "#f97316" },

    // Upload
    uploadBox: { alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb" },
    uploadingText: { marginTop: 12, color: "#708090", fontSize: 14 },
    uploadRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    uploadBtn: { flex: 1, backgroundColor: "#006994", borderRadius: 14, paddingVertical: 20, alignItems: "center" },
    uploadBtnAlt: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#006994" },
    uploadBtnIcon: { fontSize: 24, marginBottom: 6 },
    uploadBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
    altLabel: { color: "#006994" },

    // Upload result
    resultCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
    resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    resultTitle: { fontSize: 15, fontWeight: "700", color: "#10b981" },
    badge: { backgroundColor: "#eef2ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontSize: 11, color: "#6366f1", fontWeight: "600" },
    resultMeta: { fontSize: 13, color: "#708090", marginBottom: 8 },

    // Summary
    summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12, marginTop: 8 },
    summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
    summaryLabel: { fontSize: 11, color: "#708090", marginBottom: 4, textTransform: "uppercase", fontWeight: "600" },
    summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },

    // Pills
    pill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    pillActive: { backgroundColor: "#006994", borderColor: "#006994" },
    pillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    pillText: { fontSize: 13, color: "#374151", fontWeight: "500" },
    pillTextActive: { color: "#fff" },

    // Reconcile
    reconcileBtn: { borderWidth: 1.5, borderColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
    reconcileText: { color: "#006994", fontWeight: "700", fontSize: 14 },

    // Transaction row
    txRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
    txDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    txDesc: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 4 },
    txMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    txDate: { fontSize: 12, color: "#9ca3af" },
    txCatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    txCatText: { fontSize: 11, fontWeight: "600" },
    txAmt: { fontSize: 15, fontWeight: "700", color: "#111827", marginLeft: 8 },

    // Goals
    addGoalBtn: { backgroundColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 12 },
    addGoalText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    goalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
    goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    goalName: { fontSize: 15, fontWeight: "600", color: "#111827" },
    goalTarget: { fontSize: 13, color: "#708090", marginTop: 2 },
    logRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    logBtn: { backgroundColor: "#87A96B", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    logLink: { fontSize: 13, color: "#006994", fontWeight: "500" },
    infoText: { fontSize: 13, color: "#374151", marginTop: 6 },
    insightBox: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 8 },
    insightText: { fontSize: 12, color: "#166534", lineHeight: 18 },

    // Form
    formCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
    formTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: "#111827" },
    input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
    formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    cancelText: { color: "#708090", fontSize: 14 },
    saveBtn: { flex: 1, backgroundColor: "#006994", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    saveText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    // Empty
    emptyState: { alignItems: "center", marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
    emptySub: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
});
