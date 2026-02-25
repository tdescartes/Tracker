import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi } from "../../src/lib/api";
import { ShoppingSkeleton } from "../../src/components/Skeleton";

export default function ShoppingListScreen() {
    const qc = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["shopping-list"],
        queryFn: () => pantryApi.shoppingList().then((r) => r.data),
    });

    const removeFromList = useMutation({
        mutationFn: (id: string) => pantryApi.update(id, { on_shopping_list: false }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list"] }),
    });

    return (
        <View style={s.screen}>
            {isLoading && items.length === 0 ? <ShoppingSkeleton /> :
                <FlatList
                    data={items}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={s.list}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Text style={s.emptyIcon}>🛒</Text>
                            <Text style={s.emptyText}>
                                Shopping list is empty.{"\n"}Items auto-add when you mark them as used or trashed.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={s.card}>
                            <View style={s.info}>
                                <Text style={s.name}>{item.name}</Text>
                                {item.category && <Text style={s.category}>{item.category}</Text>}
                            </View>
                            <TouchableOpacity
                                style={s.removeBtn}
                                onPress={() => removeFromList.mutate(item.id)}
                            >
                                <Text style={s.removeText}>✓ Got it</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />}
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    list: { padding: 16, gap: 10 },
    empty: { alignItems: "center", marginTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyText: { color: "#708090", fontSize: 14, textAlign: "center", lineHeight: 22 },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: "#111827" },
    category: { fontSize: 12, color: "#708090", marginTop: 2 },
    removeBtn: { backgroundColor: "#87A96B", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    removeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
