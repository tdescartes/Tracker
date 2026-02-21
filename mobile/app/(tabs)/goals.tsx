import { useState } from "react";
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, Alert, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "../../src/lib/api";

export default function GoalsScreen() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);

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

    const handleDelete = (id: string, name: string) => {
        Alert.alert("Delete Goal", `Delete "${name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteGoal.mutate(id) },
        ]);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowForm(true)}
            >
                <Text style={styles.addBtnText}>＋ New Goal</Text>
            </TouchableOpacity>

            {showForm && (
                <AddGoalForm
                    onClose={() => setShowForm(false)}
                />
            )}

            {isLoading ? (
                <ActivityIndicator color="#006994" style={{ marginTop: 40 }} />
            ) : goals.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={styles.emptyTitle}>No goals yet</Text>
                    <Text style={styles.emptySub}>Create a goal to start planning</Text>
                </View>
            ) : (
                <FlatList
                    data={goals}
                    keyExtractor={(item: any) => item.id}
                    renderItem={({ item }) => (
                        <GoalCard
                            goal={item}
                            onDelete={() => handleDelete(item.id, item.goal_name)}
                            onUpdate={(data) => updateGoal.mutate({ id: item.id, data })}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

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

    const handleSubmit = () => {
        if (!name || !target) return;
        create.mutate({
            goal_name: name,
            target_amount: parseFloat(target),
            saved_amount: parseFloat(saved || "0"),
            monthly_contribution: parseFloat(monthly || "0"),
        });
    };

    return (
        <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Goal</Text>
            <TextInput style={styles.input} placeholder="Goal name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Target $" value={target} onChangeText={setTarget} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Already saved $" value={saved} onChangeText={setSaved} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Monthly savings $" value={monthly} onChangeText={setMonthly} keyboardType="numeric" />
            <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={create.isPending}>
                    <Text style={styles.saveText}>{create.isPending ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function GoalCard({ goal, onDelete, onUpdate }: {
    goal: any; onDelete: () => void; onUpdate: (data: object) => void;
}) {
    const pct = Math.min((parseFloat(goal.saved_amount) / parseFloat(goal.target_amount)) * 100, 100);
    const [logAmount, setLogAmount] = useState("");
    const [showLog, setShowLog] = useState(false);

    const handleLog = () => {
        const amount = parseFloat(logAmount);
        if (!amount || amount <= 0) return;
        onUpdate({ saved_amount: parseFloat(goal.saved_amount || "0") + amount });
        setLogAmount("");
        setShowLog(false);
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>{goal.goal_name}</Text>
                    <Text style={styles.goalTarget}>Target: ${parseFloat(goal.target_amount).toLocaleString()}</Text>
                </View>
                <TouchableOpacity onPress={onDelete}>
                    <Text style={styles.deleteText}>🗑</Text>
                </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressText}>
                ${parseFloat(goal.saved_amount).toLocaleString()} saved · {pct.toFixed(0)}%
            </Text>

            {/* Log savings */}
            {showLog ? (
                <View style={styles.logRow}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="Amount"
                        keyboardType="numeric"
                        value={logAmount}
                        onChangeText={setLogAmount}
                    />
                    <TouchableOpacity style={styles.logBtn} onPress={handleLog}>
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowLog(false)}>
                        <Text style={{ color: "#708090", fontSize: 16, paddingLeft: 8 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={() => setShowLog(true)} style={{ marginTop: 4 }}>
                    <Text style={styles.logLink}>💰 Log Savings</Text>
                </TouchableOpacity>
            )}

            {/* Info */}
            {goal.months_to_goal && (
                <Text style={styles.infoText}>
                    📅 {goal.months_to_goal} months to goal
                    {goal.estimated_completion ? ` (${new Date(goal.estimated_completion).toLocaleDateString("en-US", { month: "short", year: "numeric" })})` : ""}
                </Text>
            )}
            {goal.is_loan && goal.monthly_loan_payment && (
                <Text style={styles.infoText}>
                    🏦 ${parseFloat(goal.monthly_loan_payment).toFixed(2)}/mo loan
                </Text>
            )}
            {goal.insight && (
                <View style={styles.insightBox}>
                    <Text style={styles.insightText}>{goal.insight}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
    addBtn: {
        backgroundColor: "#006994", borderRadius: 10, paddingVertical: 12,
        alignItems: "center", marginBottom: 12,
    },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    formCard: {
        backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    formTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: "#111827" },
    input: {
        borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10,
    },
    formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
        paddingVertical: 10, alignItems: "center",
    },
    cancelText: { color: "#708090", fontSize: 14 },
    saveBtn: {
        flex: 1, backgroundColor: "#006994", borderRadius: 8,
        paddingVertical: 10, alignItems: "center",
    },
    saveText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: "#e5e7eb",
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    goalName: { fontSize: 15, fontWeight: "600", color: "#111827" },
    goalTarget: { fontSize: 13, color: "#708090", marginTop: 2 },
    deleteText: { fontSize: 18 },
    progressTrack: {
        height: 8, backgroundColor: "#e5e7eb", borderRadius: 99, marginTop: 12,
        overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: "#87A96B", borderRadius: 99 },
    progressText: { fontSize: 12, color: "#708090", marginTop: 4 },
    logRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    logBtn: {
        backgroundColor: "#87A96B", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    },
    logLink: { fontSize: 13, color: "#006994", fontWeight: "500" },
    infoText: { fontSize: 13, color: "#374151", marginTop: 6 },
    insightBox: {
        backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 8,
    },
    insightText: { fontSize: 12, color: "#166534", lineHeight: 18 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
});
