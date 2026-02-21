import { useState, useCallback } from "react";
import {
    View, Text, TouchableOpacity, ActivityIndicator, ScrollView,
    StyleSheet, Alert, FlatList, RefreshControl,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankApi, plaidApi } from "../../src/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
    Groceries: "#22c55e",
    Dining: "#f97316",
    Transport: "#3b82f6",
    Utilities: "#eab308",
    Entertainment: "#a855f7",
    Shopping: "#ec4899",
    Healthcare: "#ef4444",
    Subscriptions: "#6366f1",
    Income: "#10b981",
    Transfer: "#9ca3af",
    Other: "#6b7280",
};

export default function BankScreen() {
    const qc = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [refreshing, setRefreshing] = useState(false);

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
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const pickDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "text/csv"],
                copyToCacheDirectory: true,
            });
            if (res.canceled || !res.assets?.[0]) return;
            const file = res.assets[0];
            await doUpload(file.uri, file.mimeType || "application/pdf", file.name || "statement.pdf");
        } catch {
            Alert.alert("Error", "Could not pick document.");
        }
    };

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permission required", "Photo library access is needed.");
            return;
        }
        const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
        if (picked.canceled || !picked.assets?.[0]) return;
        const asset = picked.assets[0];
        await doUpload(asset.uri, "image/jpeg", "statement.jpg");
    };

    const doUpload = async (uri: string, mime: string, name: string) => {
        setUploading(true);
        try {
            const { data } = await bankApi.upload(uri, mime, name);
            setUploadResult(data);
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
        } catch {
            Alert.alert("Error", "Could not process statement.");
        } finally {
            setUploading(false);
        }
    };

    const categories = [...new Set(transactions.map((t: any) => t.category || "Other"))] as string[];
    const filtered = categoryFilter === "all"
        ? transactions
        : transactions.filter((t: any) => (t.category || "Other") === categoryFilter);

    const totalExpenses = transactions.filter((t: any) => !t.is_income).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
    const totalIncome = transactions.filter((t: any) => t.is_income).reduce((s: number, t: any) => s + t.amount, 0);

    return (
        <View style={s.screen}>
            <ScrollView
                contentContainerStyle={s.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006994" />}
            >
                {/* Upload Section */}
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
                            <Text style={[s.uploadBtnLabel, s.uploadBtnAltLabel]}>Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Upload Result */}
                {uploadResult && (
                    <View style={s.resultCard}>
                        <View style={s.resultHeader}>
                            <Text style={s.resultTitle}>✓ Import complete</Text>
                            {uploadResult.parsing_method && (
                                <View style={s.badge}>
                                    <Text style={s.badgeText}>{uploadResult.parsing_method}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={s.resultMeta}>
                            {uploadResult.transactions_imported} transactions
                            {uploadResult.bank_name ? ` from ${uploadResult.bank_name}` : ""}
                        </Text>
                        {uploadResult.subscriptions_found?.length > 0 && (
                            <View style={s.subsSection}>
                                <Text style={s.subsTitle}>
                                    🔔 {uploadResult.subscriptions_found.length} subscriptions detected
                                </Text>
                                {uploadResult.subscriptions_found.map((sub: any, i: number) => (
                                    <View key={i} style={s.subRow}>
                                        <Text style={s.subDesc}>{sub.description}</Text>
                                        <Text style={s.subAmt}>${Math.abs(sub.amount).toFixed(2)}/mo</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity style={s.dismissBtn} onPress={() => setUploadResult(null)}>
                            <Text style={s.dismissText}>Dismiss</Text>
                        </TouchableOpacity>
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
                            <View style={s.summaryCard}>
                                <Text style={s.summaryLabel}>Total</Text>
                                <Text style={s.summaryValue}>{filtered.length}</Text>
                            </View>
                        </View>

                        {/* Category Filter Pills */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
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

                        {/* Reconcile Button */}
                        <TouchableOpacity
                            style={s.reconcileBtn}
                            onPress={() => reconcileMutation.mutate()}
                            disabled={reconcileMutation.isPending}
                        >
                            <Text style={s.reconcileText}>
                                {reconcileMutation.isPending ? "Matching…" : "🔄 Match with Receipts"}
                            </Text>
                        </TouchableOpacity>

                        {/* Transaction List */}
                        <Text style={s.sectionTitle}>Transactions</Text>
                        {filtered.map((tx: any) => {
                            const cat = tx.category || "Other";
                            const catColor = CATEGORY_COLORS[cat] || "#6b7280";
                            return (
                                <View key={tx.id} style={s.txRow}>
                                    <View style={[s.txCatDot, { backgroundColor: catColor }]} />
                                    <View style={s.txInfo}>
                                        <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                                        <View style={s.txMeta}>
                                            <Text style={s.txDate}>{tx.date}</Text>
                                            <View style={[s.txCatBadge, { backgroundColor: catColor + "20" }]}>
                                                <Text style={[s.txCatText, { color: catColor }]}>{cat}</Text>
                                            </View>
                                            {tx.is_subscription && (
                                                <View style={s.recurBadge}>
                                                    <Text style={s.recurText}>recurring</Text>
                                                </View>
                                            )}
                                            {tx.linked_receipt_id && (
                                                <Text style={s.matchedText}>✓ matched</Text>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={[s.txAmt, tx.is_income && { color: "#10b981" }]}>
                                        {tx.is_income ? "+" : ""}
                                        {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                    </Text>
                                </View>
                            );
                        })}

                        {filtered.length === 0 && (
                            <Text style={s.emptyText}>No transactions match this filter.</Text>
                        )}
                    </>
                )}

                {transactions.length === 0 && !uploading && !uploadResult && (
                    <View style={s.emptyState}>
                        <Text style={s.emptyIcon}>🏦</Text>
                        <Text style={s.emptyTitle}>No transactions yet</Text>
                        <Text style={s.emptySubtitle}>Upload a bank statement above to get started</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12, marginTop: 8 },

    // Upload
    uploadBox: { alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb" },
    uploadingText: { marginTop: 12, color: "#708090", fontSize: 14 },
    uploadRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    uploadBtn: { flex: 1, backgroundColor: "#006994", borderRadius: 14, paddingVertical: 20, alignItems: "center" },
    uploadBtnAlt: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#006994" },
    uploadBtnIcon: { fontSize: 24, marginBottom: 6 },
    uploadBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
    uploadBtnAltLabel: { color: "#006994" },

    // Result
    resultCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
    resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    resultTitle: { fontSize: 15, fontWeight: "700", color: "#10b981" },
    badge: { backgroundColor: "#eef2ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontSize: 11, color: "#6366f1", fontWeight: "600" },
    resultMeta: { fontSize: 13, color: "#708090", marginBottom: 8 },
    subsSection: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 4 },
    subsTitle: { fontSize: 13, fontWeight: "600", color: "#f97316", marginBottom: 6 },
    subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    subDesc: { fontSize: 13, color: "#374151" },
    subAmt: { fontSize: 13, fontWeight: "600", color: "#f97316" },
    dismissBtn: { alignSelf: "flex-end", marginTop: 8 },
    dismissText: { fontSize: 13, color: "#9ca3af" },

    // Summary
    summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
    summaryLabel: { fontSize: 11, color: "#708090", marginBottom: 4, textTransform: "uppercase", fontWeight: "600" },
    summaryValue: { fontSize: 18, fontWeight: "700", color: "#111827" },

    // Category pills
    pillScroll: { marginBottom: 12, flexGrow: 0 },
    pill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    pillActive: { backgroundColor: "#006994", borderColor: "#006994" },
    pillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    pillText: { fontSize: 13, color: "#374151", fontWeight: "500" },
    pillTextActive: { color: "#fff" },

    // Reconcile
    reconcileBtn: { borderWidth: 1.5, borderColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
    reconcileText: { color: "#006994", fontWeight: "700", fontSize: 14 },

    // Transactions
    txRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
    txCatDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 4 },
    txMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    txDate: { fontSize: 12, color: "#9ca3af" },
    txCatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    txCatText: { fontSize: 11, fontWeight: "600" },
    recurBadge: { backgroundColor: "#fff7ed", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    recurText: { fontSize: 10, color: "#f97316", fontWeight: "600" },
    matchedText: { fontSize: 11, color: "#10b981", fontWeight: "600" },
    txAmt: { fontSize: 15, fontWeight: "700", color: "#111827", marginLeft: 8 },

    // Empty
    emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 24, fontSize: 14 },
    emptyState: { alignItems: "center", marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
    emptySubtitle: { fontSize: 14, color: "#9ca3af" },
});
