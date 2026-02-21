import { useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity, ActivityIndicator,
    StyleSheet, TextInput, Switch,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { recipesApi } from "../../src/lib/api";

interface Recipe {
    name: string;
    time_minutes: number | null;
    ingredients: string[];
    instructions: string;
    matched_count: number;
    missing: string[];
    match_score: number;
}

export default function RecipesScreen() {
    const [expiringFirst, setExpiringFirst] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["recipe-suggestions-mobile", expiringFirst],
        queryFn: () =>
            recipesApi.suggestions(expiringFirst, 10).then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const { data: searchData, isLoading: searchLoading } = useQuery({
        queryKey: ["recipe-search-mobile", searchQuery],
        queryFn: () => recipesApi.search(searchQuery).then((r) => r.data),
        enabled: searchQuery.length >= 2,
        staleTime: 2 * 60 * 1000,
    });

    const recipes: Recipe[] = searchQuery.length >= 2
        ? (searchData?.results ?? [])
        : (data?.suggestions ?? []);

    const renderItem = ({ item }: { item: Recipe }) => {
        const isExp = expanded === item.name;
        const scoreColor =
            item.match_score >= 80 ? "#87A96B" : item.match_score >= 50 ? "#d97706" : "#708090";

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.recipeName} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.score, { color: scoreColor }]}>{item.match_score}%</Text>
                </View>

                <View style={styles.metaRow}>
                    {item.time_minutes && (
                        <Text style={styles.meta}>⏱ {item.time_minutes} min</Text>
                    )}
                    <Text style={[styles.meta, { color: "#87A96B" }]}>
                        ✅ {item.matched_count}/{item.ingredients.length} in pantry
                    </Text>
                </View>

                {item.missing.length > 0 && (
                    <View style={styles.missingRow}>
                        {item.missing.map((m) => (
                            <View key={m} style={styles.missingBadge}>
                                <Text style={styles.missingText}>✗ {m}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => setExpanded(isExp ? null : item.name)}
                    style={styles.expandBtn}
                >
                    <Text style={styles.expandText}>
                        {isExp ? "Hide instructions ▲" : "Show instructions ▼"}
                    </Text>
                </TouchableOpacity>

                {isExp && (
                    <Text style={styles.instructions}>{item.instructions}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <TextInput
                style={styles.searchInput}
                placeholder="Search recipes (e.g. pasta, chicken…)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
            />

            {/* Toggle */}
            {searchQuery.length < 2 && (
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Prioritize expiring items</Text>
                    <Switch
                        value={expiringFirst}
                        onValueChange={setExpiringFirst}
                        trackColor={{ true: "#006994" }}
                        thumbColor="#fff"
                    />
                </View>
            )}

            {isLoading ? (
                <ActivityIndicator color="#006994" style={{ marginTop: 40 }} />
            ) : recipes.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🍽️</Text>
                    <Text style={styles.emptyTitle}>No suggestions yet</Text>
                    <Text style={styles.emptySub}>Add items to your pantry to get recipe ideas</Text>
                </View>
            ) : (
                <FlatList
                    data={recipes}
                    keyExtractor={(item) => item.name}
                    renderItem={renderItem}
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
    searchInput: {
        backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12,
    },
    toggleRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    toggleLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb",
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    recipeName: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
    score: { fontSize: 14, fontWeight: "700", shrink: 0 } as any,
    metaRow: { flexDirection: "row", gap: 12, marginTop: 6 },
    meta: { fontSize: 12, color: "#6b7280" },
    missingRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    missingBadge: {
        backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#EC5800",
        borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2,
    },
    missingText: { fontSize: 11, color: "#EC5800" },
    expandBtn: { marginTop: 10 },
    expandText: { fontSize: 13, color: "#006994", fontWeight: "500" },
    instructions: {
        fontSize: 13, color: "#374151", lineHeight: 20, marginTop: 8,
        backgroundColor: "#f9fafb", borderRadius: 8, padding: 10,
    },
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
});
