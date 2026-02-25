import { useState, useCallback, useRef } from "react";
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, Alert, Animated, Dimensions, Platform, KeyboardAvoidingView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi, insightsApi } from "../../src/lib/api";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { PantrySkeleton } from "../../src/components/Skeleton";

type Location = "ALL" | "FRIDGE" | "FREEZER" | "PANTRY";
type Segment = "stock" | "shopping";
const LOCATIONS: Location[] = ["ALL", "FRIDGE", "FREEZER", "PANTRY"];

const EMPTY_FORM = {
    name: "", category: "", location: "PANTRY" as string,
    quantity: "1", unit: "", purchase_price: "", expiration_date: "",
};

export default function PantryScreen() {
    const qc = useQueryClient();
    const [segment, setSegment] = useState<Segment>("stock");
    const [location, setLocation] = useState<Location>("ALL");
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    // ── In Stock items ────────────────────────────────────────
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["pantry", location],
        queryFn: () => pantryApi.list(location === "ALL" ? {} : { location }).then((r) => r.data),
    });

    // ── Shopping list ─────────────────────────────────────────
    const { data: shoppingItems = [], isLoading: shopLoading } = useQuery({
        queryKey: ["shopping-list"],
        queryFn: () => pantryApi.shoppingList().then((r) => r.data),
    });

    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) => pantryApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["shopping-list"] });
        },
    });

    const addItem = useMutation({
        mutationFn: (data: object) => pantryApi.addItem(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pantry"] });
            setShowAdd(false);
            setForm({ ...EMPTY_FORM });
            Toast.show({ type: "success", text1: "Item added" });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
    });

    const deleteItem = useMutation({
        mutationFn: (id: string) => pantryApi.deleteItem(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["shopping-list"] });
            Toast.show({ type: "success", text1: "Item deleted" });
        },
    });

    const handleSubmitAdd = () => {
        if (!form.name.trim()) return;
        addItem.mutate({
            name: form.name, category: form.category || null,
            location: form.location, quantity: parseFloat(form.quantity) || 1,
            unit: form.unit || null,
            purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
            expiration_date: form.expiration_date || null,
        });
    };

    const handleSubmitEdit = () => {
        if (!editItem || !form.name.trim()) return;
        updateItem.mutate({
            id: editItem.id,
            data: {
                name: form.name, category: form.category || null,
                location: form.location, quantity: parseFloat(form.quantity) || 1,
                unit: form.unit || null,
                purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
                expiration_date: form.expiration_date || null,
            },
        });
        setEditItem(null);
        setForm({ ...EMPTY_FORM });
    };

    const openEdit = (item: any) => {
        setForm({
            name: item.name || "", category: item.category || "",
            location: item.location || "PANTRY",
            quantity: String(item.quantity || "1"), unit: item.unit || "",
            purchase_price: item.purchase_price ? String(item.purchase_price) : "",
            expiration_date: item.expiration_date || "",
        });
        setEditItem(item);
        setShowAdd(false);
    };

    const handleAction = (item: any, status: "CONSUMED" | "TRASHED") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            status === "CONSUMED" ? "Mark as used?" : "Throw away?",
            item.name,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: status === "TRASHED" ? "destructive" : "default",
                    onPress: () => updateItem.mutate({ id: item.id, data: { status } }),
                },
            ]
        );
    };

    const handleDelete = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert("Delete Item", `Permanently delete "${item.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteItem.mutate(item.id) },
        ]);
    };

    const handleGotIt = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateItem.mutate({ id: item.id, data: { on_shopping_list: false } });
        Toast.show({ type: "success", text1: `Got ${item.name}!` });
    };

    // Sort: expiring items first
    const sortedItems = [...items].sort((a: any, b: any) => {
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    });

    // Compute inline pantry insights
    const expiringItems = items.filter((item: any) => {
        if (!item.expiration_date) return false;
        const daysLeft = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000);
        return daysLeft >= 0 && daysLeft <= 3;
    });
    const expiringValue = expiringItems.reduce((sum: number, i: any) => sum + (parseFloat(i.purchase_price) || 0) * (parseFloat(i.quantity) || 1), 0);

    const { data: insights = [] } = useQuery({
        queryKey: ["insights"],
        queryFn: () => insightsApi.list().then((r: any) => r.data),
        staleTime: 60_000,
    });
    const pantryInsights = insights.filter((i: any) => i.screen === "pantry");

    return (
        <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {/* Segment Control */}
            <View style={s.segRow}>
                <TouchableOpacity
                    style={[s.segBtn, segment === "stock" && s.segActive]}
                    onPress={() => { setSegment("stock"); Haptics.selectionAsync(); }}
                >
                    <Text style={[s.segText, segment === "stock" && s.segTextActive]}>
                        In Stock ({items.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.segBtn, segment === "shopping" && s.segActive]}
                    onPress={() => { setSegment("shopping"); Haptics.selectionAsync(); }}
                >
                    <Text style={[s.segText, segment === "shopping" && s.segTextActive]}>
                        Shopping ({shoppingItems.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {segment === "stock" ? (
                <>
                    {/* Location Filter + Add button */}
                    <View style={s.filterRow}>
                        <FlatList
                            horizontal
                            data={LOCATIONS}
                            keyExtractor={(i) => i}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item: loc }) => (
                                <TouchableOpacity
                                    onPress={() => setLocation(loc)}
                                    style={[s.chip, location === loc && s.chipActive]}
                                >
                                    <Text style={[s.chipText, location === loc && s.chipActiveText]}>
                                        {loc.charAt(0) + loc.slice(1).toLowerCase()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={s.addBtn}
                            onPress={() => {
                                setShowAdd(!showAdd); setEditItem(null);
                                setForm({ ...EMPTY_FORM });
                            }}
                        >
                            <Text style={s.addBtnText}>{showAdd ? "✕" : "＋"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add / Edit Form */}
                    {(showAdd || editItem) && (
                        <View style={s.formCard}>
                            <Text style={s.formTitle}>{editItem ? "Edit Item" : "Add Item"}</Text>
                            <TextInput style={s.input} placeholder="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
                            <View style={s.formRow}>
                                <TextInput style={[s.input, { flex: 1 }]} placeholder="Category" value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} />
                                <View style={[s.input, { flex: 1, padding: 0 }]}>
                                    <TouchableOpacity
                                        style={s.locationPicker}
                                        onPress={() => {
                                            const locs = ["FRIDGE", "FREEZER", "PANTRY"];
                                            const idx = locs.indexOf(form.location);
                                            setForm({ ...form, location: locs[(idx + 1) % 3] });
                                        }}
                                    >
                                        <Text style={s.locationPickerText}>{form.location}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={s.formRow}>
                                <TextInput style={[s.input, { flex: 1 }]} placeholder="Qty" value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} keyboardType="numeric" />
                                <TextInput style={[s.input, { flex: 1 }]} placeholder="Unit" value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} />
                                <TextInput style={[s.input, { flex: 1 }]} placeholder="Price $" value={form.purchase_price} onChangeText={(v) => setForm({ ...form, purchase_price: v })} keyboardType="numeric" />
                            </View>
                            <TextInput style={s.input} placeholder="Expiration (YYYY-MM-DD)" value={form.expiration_date} onChangeText={(v) => setForm({ ...form, expiration_date: v })} />
                            <View style={s.formBtns}>
                                <TouchableOpacity
                                    style={s.cancelFormBtn}
                                    onPress={() => { setShowAdd(false); setEditItem(null); setForm({ ...EMPTY_FORM }); }}
                                >
                                    <Text style={s.cancelFormText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.submitBtn}
                                    onPress={editItem ? handleSubmitEdit : handleSubmitAdd}
                                    disabled={addItem.isPending}
                                >
                                    <Text style={s.submitText}>{editItem ? "Update" : "Add"}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Expiring items banner */}
                    {expiringItems.length > 0 && (
                        <View style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: "#fecaca" }}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#991b1b" }}>
                                ⚠️ {expiringItems.length} item{expiringItems.length > 1 ? "s" : ""} expiring soon
                                {expiringValue > 0 ? ` (~$${expiringValue.toFixed(2)} at risk)` : ""}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>
                                {expiringItems.slice(0, 3).map((i: any) => i.name).join(", ")}
                                {expiringItems.length > 3 ? ` +${expiringItems.length - 3} more` : ""}
                            </Text>
                        </View>
                    )}

                    {/* Pantry insights from backend */}
                    {pantryInsights.length > 0 && pantryInsights.map((ins: any, idx: number) => (
                        <View
                            key={idx}
                            style={{
                                backgroundColor: ins.type === "warning" ? "#fff7ed" : ins.type === "tip" ? "#eff6ff" : "#f9fafb",
                                borderRadius: 12, padding: 12, marginHorizontal: 12, marginBottom: 8,
                                borderWidth: 1,
                                borderColor: ins.type === "warning" ? "#fed7aa" : ins.type === "tip" ? "#bfdbfe" : "#e5e7eb",
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "600", color: ins.type === "warning" ? "#9a3412" : ins.type === "tip" ? "#1e40af" : "#374151" }}>
                                {ins.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{ins.body}</Text>
                        </View>
                    ))}

                    {/* Item List */}
                    {isLoading && items.length === 0 ? <PantrySkeleton /> : <FlatList
                        data={sortedItems}
                        keyExtractor={(i) => i.id}
                        contentContainerStyle={s.list}
                        ListEmptyComponent={
                            <View style={s.emptyBox}>
                                <Text style={s.emptyIcon}>📦</Text>
                                <Text style={s.emptyTitle}>Your pantry is empty</Text>
                                <Text style={s.emptySub}>Scan a receipt or tap + to add items</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const daysLeft = item.expiration_date
                                ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
                                : null;
                            const urgent = daysLeft !== null && daysLeft <= 3;
                            return (
                                <TouchableOpacity
                                    style={[s.card, urgent && s.cardUrgent]}
                                    onLongPress={() => openEdit(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.name}>{item.name}</Text>
                                            {item.category && <Text style={s.meta}>{item.category} · {item.location}</Text>}
                                            {item.expiration_date && (
                                                <Text style={[s.expiry, urgent && s.expiryUrgent]}>
                                                    Expires {format(new Date(item.expiration_date), "MMM d")}
                                                    {daysLeft !== null && daysLeft <= 7 ? ` (${daysLeft}d)` : ""}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[s.status, { color: item.status === "OPENED" ? "#2563eb" : "#87A96B" }]}>
                                            {item.status?.toLowerCase()}
                                        </Text>
                                    </View>
                                    <View style={s.actions}>
                                        <TouchableOpacity style={s.btnUsed} onPress={() => handleAction(item, "CONSUMED")}>
                                            <Text style={s.btnUsedText}>✓ Used</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.btnTrash} onPress={() => handleAction(item, "TRASHED")}>
                                            <Text style={s.btnTrashText}>🗑 Trash</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.btnDelete} onPress={() => handleDelete(item)}>
                                            <Text style={s.btnDeleteText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />}
                </>
            ) : (
                // ── Shopping List ─────────────────────────────────
                shopLoading && shoppingItems.length === 0 ? <PantrySkeleton /> : <FlatList
                    data={shoppingItems}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={s.list}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <Text style={s.emptyIcon}>🛒</Text>
                            <Text style={s.emptyTitle}>Shopping list is empty</Text>
                            <Text style={s.emptySub}>Items auto-add when you mark them as used or trashed</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={s.shopCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.name}>{item.name}</Text>
                                {item.category && <Text style={s.meta}>{item.category}</Text>}
                            </View>
                            <TouchableOpacity style={s.gotItBtn} onPress={() => handleGotIt(item)}>
                                <Text style={s.gotItText}>✓ Got it</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },

    // Segment
    segRow: { flexDirection: "row", margin: 12, backgroundColor: "#e5e7eb", borderRadius: 10, padding: 3 },
    segBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
    segActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    segText: { fontSize: 13, fontWeight: "600", color: "#708090" },
    segTextActive: { color: "#006994" },

    // Filters
    filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db", marginRight: 6 },
    chipActive: { backgroundColor: "#006994", borderColor: "#006994" },
    chipText: { fontSize: 13, color: "#708090" },
    chipActiveText: { color: "#fff", fontWeight: "600" },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#006994", alignItems: "center", justifyContent: "center" },
    addBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },

    // Form
    formCard: { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    formTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: "#111827" },
    input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
    formRow: { flexDirection: "row", gap: 8 },
    locationPicker: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center" },
    locationPickerText: { fontSize: 14, color: "#006994", fontWeight: "600" },
    formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelFormBtn: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    cancelFormText: { color: "#708090", fontSize: 14 },
    submitBtn: { flex: 1, backgroundColor: "#006994", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    submitText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    // List
    list: { padding: 12, paddingBottom: 24, gap: 10 },

    // Item card
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
    cardUrgent: { borderColor: "#EC5800" },
    cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    name: { fontSize: 15, fontWeight: "600", color: "#111827" },
    status: { fontSize: 12, fontWeight: "600" },
    meta: { fontSize: 12, color: "#708090", marginTop: 2 },
    expiry: { fontSize: 12, color: "#708090", marginTop: 4 },
    expiryUrgent: { color: "#EC5800", fontWeight: "700" },
    actions: { flexDirection: "row", gap: 8 },
    btnUsed: { flex: 1, borderWidth: 1, borderColor: "#87A96B", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    btnUsedText: { color: "#6a8754", fontWeight: "600", fontSize: 13 },
    btnTrash: { flex: 1, borderWidth: 1, borderColor: "#EC5800", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    btnTrashText: { color: "#EC5800", fontWeight: "600", fontSize: 13 },
    btnDelete: { width: 36, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, alignItems: "center", justifyContent: "center" },
    btnDeleteText: { color: "#9ca3af", fontSize: 16, fontWeight: "600" },

    // Shopping
    shopCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
    gotItBtn: { backgroundColor: "#87A96B", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    gotItText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    // Empty
    emptyBox: { alignItems: "center", marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
});
