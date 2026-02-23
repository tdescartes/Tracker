import { useState, useCallback } from "react";
import {
    View, Text, TouchableOpacity, ActivityIndicator, ScrollView,
    StyleSheet, Alert, TextInput, FlatList, RefreshControl, Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { receiptApi, budgetApi, insightsApi } from "../../src/lib/api";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

const CATEGORIES = ["Produce", "Dairy", "Meat", "Bakery", "Frozen", "Snacks", "Drinks", "Household", "Other"];

export default function ScanScreen() {
    const qc = useQueryClient();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [editMerchant, setEditMerchant] = useState("");
    const [editTotal, setEditTotal] = useState("");
    const [tab, setTab] = useState<"scan" | "history">("scan");
    const [refreshing, setRefreshing] = useState(false);
    const [nudge, setNudge] = useState<{
        itemCount: number; total: string; budgetSpent?: string;
        budgetLimit?: string; onTrack?: boolean; insight?: string;
    } | null>(null);

    // Receipt history
    const { data: receipts = [], refetch } = useQuery({
        queryKey: ["receipts"],
        queryFn: () => receiptApi.list().then((r) => r.data),
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const pickImage = async (fromCamera: boolean) => {
        const pickerFn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        const perm = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!perm.granted) {
            Alert.alert("Permission required", fromCamera ? "Camera access is needed." : "Photo library access is needed.");
            return;
        }

        const picked = await pickerFn({ quality: 0.9, base64: false });
        if (picked.canceled || !picked.assets[0]) return;

        setScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { data } = await receiptApi.upload(picked.assets[0].uri);
            setResult(data);
            // Populate editable fields
            setEditMerchant(data.merchant_name || "");
            setEditTotal(String(data.total_amount || "0"));
            setEditItems(
                (data.items || []).map((it: any, i: number) => ({
                    ...it,
                    _key: i,
                    name: it.name || "",
                    price: String(it.price ?? "0"),
                    category: it.category || "Other",
                    quantity: String(it.quantity ?? "1"),
                }))
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert("Error", "Could not process receipt. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const updateItem = (idx: number, field: string, value: string) => {
        setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    };

    const removeItem = (idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const addItem = () => {
        setEditItems((prev) => [...prev, { _key: Date.now(), name: "", price: "0", category: "Other", quantity: "1" }]);
    };

    const confirmReceipt = async () => {
        if (!result) return;
        const itemCount = editItems.length;
        const total = editTotal;
        try {
            await receiptApi.confirm(result.id, {
                merchant_name: editMerchant,
                total_amount: editTotal,
                purchase_date: result.purchase_date,
                items: editItems.map((it) => ({
                    name: it.name,
                    price: parseFloat(it.price) || 0,
                    category: it.category,
                    quantity: parseInt(it.quantity) || 1,
                })),
            });
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["receipts"] });
            qc.invalidateQueries({ queryKey: ["budget"] });
            setResult(null);
            setEditItems([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Build nudge card with budget context
            const now = new Date();
            const nudgeData: typeof nudge = { itemCount, total };
            try {
                const [budgetRes, insightRes] = await Promise.all([
                    budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r: any) => r.data),
                    insightsApi.list().then((r: any) => r.data),
                ]);
                nudgeData.budgetSpent = budgetRes.total_spent;
                nudgeData.budgetLimit = budgetRes.budget_limit;
                nudgeData.onTrack = budgetRes.on_track;
                const hint = insightRes.find((i: any) =>
                    i.screen === "budget" || i.type === "budget_pace" || i.type === "category_change"
                );
                if (hint) nudgeData.insight = hint.body;
            } catch { /* best-effort */ }
            setNudge(nudgeData);
        } catch {
            Alert.alert("Error", "Could not save items.");
        }
    };

    // ────────── Nudge Modal after confirm ──────────
    if (nudge) {
        return (
            <View style={s.screen}>
                <ScrollView contentContainerStyle={[s.container, { paddingTop: 40 }]}>
                    <View style={{ backgroundColor: "#f0fdf4", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#bbf7d0" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 18 }}>✓</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#166534" }}>
                                    ${parseFloat(nudge.total).toFixed(2)} added to pantry
                                </Text>
                                <Text style={{ fontSize: 13, color: "#15803d", marginTop: 2 }}>
                                    {nudge.itemCount} item{nudge.itemCount !== 1 ? "s" : ""} saved with expiry tracking
                                </Text>
                            </View>
                        </View>

                        {nudge.budgetSpent && nudge.budgetLimit && (
                            <View style={{ backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                                    Groceries this month: ${parseFloat(nudge.budgetSpent).toFixed(2)}
                                    <Text style={{ color: "#708090" }}> / ${parseFloat(nudge.budgetLimit).toFixed(2)}</Text>
                                </Text>
                                <Text style={{ fontSize: 12, color: nudge.onTrack ? "#16a34a" : "#ea580c", marginTop: 3 }}>
                                    {nudge.onTrack ? "✓ You're on pace — good." : "⚠ Spending is above pace this month."}
                                </Text>
                            </View>
                        )}

                        {nudge.insight && (
                            <View style={{ backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                                <Text style={{ fontSize: 13, color: "#374151" }}>💡 {nudge.insight}</Text>
                            </View>
                        )}

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
                                onPress={() => { setNudge(null); router.push("/(tabs)/pantry"); }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>View Pantry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
                                onPress={() => setNudge(null)}
                            >
                                <Text style={{ color: "#374151", fontWeight: "600", fontSize: 14 }}>Scan Another</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // ────────── Editable Review Screen ──────────
    if (result) {
        const computedTotal = editItems.reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1), 0);
        return (
            <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
                <Text style={s.title}>Review & Edit</Text>

                {/* Merchant + Total */}
                <View style={s.fieldRow}>
                    <View style={{ flex: 2 }}>
                        <Text style={s.fieldLabel}>Merchant</Text>
                        <TextInput
                            style={s.input}
                            value={editMerchant}
                            onChangeText={setEditMerchant}
                            placeholder="Store name"
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.fieldLabel}>Total</Text>
                        <TextInput
                            style={s.input}
                            value={editTotal}
                            onChangeText={setEditTotal}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                <Text style={s.meta}>{result.purchase_date || "Today"} · Computed: ${computedTotal.toFixed(2)}</Text>

                {/* Editable Items */}
                <View style={s.itemList}>
                    {editItems.map((item, i) => (
                        <View key={item._key} style={s.editItemCard}>
                            <View style={s.editRow}>
                                <TextInput
                                    style={[s.input, { flex: 2 }]}
                                    value={item.name}
                                    onChangeText={(v) => updateItem(i, "name", v)}
                                    placeholder="Item name"
                                />
                                <TextInput
                                    style={[s.input, { flex: 0.7, marginLeft: 6 }]}
                                    value={item.price}
                                    onChangeText={(v) => updateItem(i, "price", v)}
                                    keyboardType="decimal-pad"
                                    placeholder="$"
                                />
                                <TextInput
                                    style={[s.input, { flex: 0.5, marginLeft: 6 }]}
                                    value={item.quantity}
                                    onChangeText={(v) => updateItem(i, "quantity", v)}
                                    keyboardType="number-pad"
                                    placeholder="Qty"
                                />
                            </View>
                            <View style={s.catRow}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[s.catPill, item.category === cat && s.catPillActive]}
                                            onPress={() => updateItem(i, "category", cat)}
                                        >
                                            <Text style={[s.catPillText, item.category === cat && s.catPillActiveText]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={() => removeItem(i)} style={s.removeBtn}>
                                    <Text style={s.removeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
                    <Text style={s.addItemText}>+ Add Item</Text>
                </TouchableOpacity>

                <View style={s.btnRow}>
                    <TouchableOpacity style={s.btnCancel} onPress={() => { setResult(null); setEditItems([]); }}>
                        <Text style={s.btnCancelText}>Re-scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnConfirm} onPress={confirmReceipt}>
                        <Text style={s.btnConfirmText}>Add to Pantry ({editItems.length})</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // ────────── Main: Scan / History tabs ──────────
    return (
        <View style={s.screen}>
            {/* Tab bar */}
            <View style={s.segBar}>
                {(["scan", "history"] as const).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[s.segBtn, tab === t && s.segBtnActive]}
                        onPress={() => { setTab(t); Haptics.selectionAsync(); }}
                    >
                        <Text style={[s.segText, tab === t && s.segTextActive]}>
                            {t === "scan" ? "📷 Scan" : `📋 History (${receipts.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === "scan" ? (
                <View style={[s.center, { flex: 1 }]}>
                    {scanning ? (
                        <>
                            <ActivityIndicator size="large" color="#006994" />
                            <Text style={s.scanningText}>Scanning receipt…</Text>
                            <Text style={s.scanSub}>AI is reading your receipt</Text>
                        </>
                    ) : (
                        <>
                            <Text style={s.title}>Scan a Receipt</Text>
                            <Text style={s.subtitle}>Take a photo or pick from your gallery</Text>

                            <TouchableOpacity style={s.bigBtn} onPress={() => pickImage(true)}>
                                <Text style={s.bigBtnIcon}>📷</Text>
                                <Text style={s.bigBtnText}>Take Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[s.bigBtn, s.bigBtnAlt]} onPress={() => pickImage(false)}>
                                <Text style={s.bigBtnIcon}>🖼️</Text>
                                <Text style={[s.bigBtnText, s.bigBtnAltText]}>Choose from Library</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            ) : (
                <FlatList
                    data={receipts}
                    keyExtractor={(item: any) => String(item.id)}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006994" />}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <Text style={s.emptyText}>No receipts yet. Scan one!</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={s.receiptCard}>
                            <View style={s.receiptHeader}>
                                <Text style={s.receiptMerchant}>{item.merchant_name || "Unknown"}</Text>
                                <Text style={s.receiptTotal}>${parseFloat(item.total_amount || "0").toFixed(2)}</Text>
                            </View>
                            <Text style={s.receiptMeta}>
                                {item.purchase_date || "—"} · {item.item_count ?? item.items?.length ?? 0} items
                            </Text>
                            <View style={s.receiptStatusRow}>
                                <View style={[s.statusBadge, {
                                    backgroundColor: item.status === "confirmed" ? "#dcfce7" : item.status === "pending" ? "#fef3c7" : "#f3f4f6"
                                }]}>
                                    <Text style={[s.statusText, {
                                        color: item.status === "confirmed" ? "#166534" : item.status === "pending" ? "#92400e" : "#374151"
                                    }]}>
                                        {item.status || "processed"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16, paddingBottom: 32 },
    center: { alignItems: "center", justifyContent: "center", padding: 24 },
    title: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 6 },
    subtitle: { fontSize: 14, color: "#708090", textAlign: "center", marginBottom: 32 },
    scanningText: { marginTop: 16, color: "#708090", fontSize: 15, fontWeight: "600" },
    scanSub: { marginTop: 4, color: "#9ca3af", fontSize: 13 },

    // Segments
    segBar: { flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: "#e5e7eb", borderRadius: 10, padding: 3 },
    segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
    segBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    segText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
    segTextActive: { color: "#006994" },

    // Scan buttons
    bigBtn: { backgroundColor: "#006994", borderRadius: 14, paddingVertical: 18, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 12 },
    bigBtnAlt: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#006994" },
    bigBtnIcon: { fontSize: 28, marginBottom: 6 },
    bigBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    bigBtnAltText: { color: "#006994" },

    // Review screen
    fieldRow: { flexDirection: "row", marginBottom: 8 },
    fieldLabel: { fontSize: 11, fontWeight: "600", color: "#708090", marginBottom: 4 },
    input: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
    meta: { fontSize: 13, color: "#708090", marginBottom: 12 },
    merchant: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 2 },
    itemList: { marginBottom: 12 },
    editItemCard: { backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
    editRow: { flexDirection: "row", marginBottom: 6 },
    catRow: { flexDirection: "row", alignItems: "center" },
    catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: "#f3f4f6", marginRight: 6 },
    catPillActive: { backgroundColor: "#006994" },
    catPillText: { fontSize: 11, color: "#374151" },
    catPillActiveText: { color: "#fff", fontWeight: "600" },
    removeBtn: { padding: 6, marginLeft: 8 },
    removeBtnText: { color: "#EC5800", fontSize: 16, fontWeight: "700" },
    addItemBtn: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, marginBottom: 16 },
    addItemText: { color: "#006994", fontWeight: "700", fontSize: 14 },

    // Button row
    btnRow: { flexDirection: "row", gap: 12 },
    btnCancel: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnCancelText: { color: "#374151", fontWeight: "600" },
    btnConfirm: { flex: 1, backgroundColor: "#006994", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnConfirmText: { color: "#fff", fontWeight: "700" },

    // History
    emptyBox: { backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center" },
    emptyText: { color: "#708090", fontSize: 14 },
    receiptCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
    receiptHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    receiptMerchant: { fontSize: 15, fontWeight: "700", color: "#111827" },
    receiptTotal: { fontSize: 15, fontWeight: "700", color: "#006994" },
    receiptMeta: { fontSize: 12, color: "#708090", marginBottom: 8 },
    receiptStatusRow: { flexDirection: "row" },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
});
