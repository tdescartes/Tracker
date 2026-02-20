import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi } from "../../src/lib/api";
import { format } from "date-fns";

type Location = "ALL" | "FRIDGE" | "FREEZER" | "PANTRY";
const LOCATIONS: Location[] = ["ALL", "FRIDGE", "FREEZER", "PANTRY"];

export default function PantryScreen() {
    const qc = useQueryClient();
    const [location, setLocation] = useState<Location>("ALL");

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["pantry", location],
        queryFn: () => pantryApi.list(location === "ALL" ? {} : { location }).then((r) => r.data),
    });

    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) => pantryApi.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
    });

    const handleAction = (item: any, status: "CONSUMED" | "TRASHED") => {
        Alert.alert(
            status === "CONSUMED" ? "Mark as used?" : "Throw away?",
            item.name,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm", style: status === "TRASHED" ? "destructive" : "default",
                    onPress: () => updateItem.mutate({ id: item.id, data: { status } })
                },
            ]
        );
    };

    return (
        <View style={s.screen}>
            {/* Location Filter */}
            <View style={s.filters}>
                {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                        key={loc}
                        onPress={() => setLocation(loc)}
                        style={[s.chip, location === loc && s.chipActive]}
                    >
                        <Text style={[s.chipText, location === loc && s.chipActiveText]}>
                            {loc.charAt(0) + loc.slice(1).toLowerCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                contentContainerStyle={s.list}
                ListEmptyComponent={
                    <Text style={s.empty}>{isLoading ? "Loading…" : "No items. Scan a receipt to add items."}</Text>
                }
                renderItem={({ item }) => {
                    const daysLeft = item.expiration_date
                        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
                        : null;
                    const urgent = daysLeft !== null && daysLeft <= 3;
                    return (
                        <View style={[s.card, urgent && s.cardUrgent]}>
                            <View style={s.cardTop}>
                                <Text style={s.name}>{item.name}</Text>
                                <Text style={[s.status, { color: item.status === "OPENED" ? "#2563eb" : "#87A96B" }]}>
                                    {item.status.toLowerCase()}
                                </Text>
                            </View>
                            {item.category && <Text style={s.meta}>{item.category} · {item.location}</Text>}
                            {item.expiration_date && (
                                <Text style={[s.expiry, urgent && s.expiryUrgent]}>
                                    Expires {format(new Date(item.expiration_date), "MMM d")}
                                    {daysLeft !== null && daysLeft <= 7 ? ` (${daysLeft}d)` : ""}
                                </Text>
                            )}
                            <View style={s.actions}>
                                <TouchableOpacity style={s.btnUsed} onPress={() => handleAction(item, "CONSUMED")}>
                                    <Text style={s.btnUsedText}>✓ Used</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.btnTrash} onPress={() => handleAction(item, "TRASHED")}>
                                    <Text style={s.btnTrashText}>🗑 Trash</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    filters: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db" },
    chipActive: { backgroundColor: "#006994", borderColor: "#006994" },
    chipText: { fontSize: 13, color: "#708090" },
    chipActiveText: { color: "#fff", fontWeight: "600" },
    list: { padding: 12, gap: 10 },
    empty: { textAlign: "center", color: "#708090", marginTop: 40, fontSize: 14 },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb" },
    cardUrgent: { borderColor: "#EC5800" },
    cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    name: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
    status: { fontSize: 12, fontWeight: "600" },
    meta: { fontSize: 12, color: "#708090", marginBottom: 2 },
    expiry: { fontSize: 12, color: "#708090", marginBottom: 10 },
    expiryUrgent: { color: "#EC5800", fontWeight: "700" },
    actions: { flexDirection: "row", gap: 10 },
    btnUsed: { flex: 1, borderWidth: 1, borderColor: "#87A96B", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    btnUsedText: { color: "#6a8754", fontWeight: "600", fontSize: 13 },
    btnTrash: { flex: 1, borderWidth: 1, borderColor: "#EC5800", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    btnTrashText: { color: "#EC5800", fontWeight: "600", fontSize: 13 },
});
