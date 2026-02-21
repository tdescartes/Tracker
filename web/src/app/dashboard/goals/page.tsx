"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api";
import { Trash2, Plus, Target, Pencil, DollarSign, X } from "lucide-react";

interface GoalForm {
    goal_name: string;
    target_amount: string;
    saved_amount: string;
    monthly_contribution: string;
    is_loan: boolean;
    interest_rate: string;
    loan_term_months: string;
}

const defaultForm: GoalForm = {
    goal_name: "",
    target_amount: "",
    saved_amount: "0",
    monthly_contribution: "300",
    is_loan: false,
    interest_rate: "5.0",
    loan_term_months: "60",
};

export default function GoalsPage() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<GoalForm>(defaultForm);

    const { data: goals = [] } = useQuery({
        queryKey: ["goals"],
        queryFn: () => goalsApi.list().then((r) => r.data),
    });

    const createGoal = useMutation({
        mutationFn: (data: object) => goalsApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setShowForm(false); setForm(defaultForm); },
    });

    const updateGoal = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) => goalsApi.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    });

    const deleteGoal = useMutation({
        mutationFn: (id: string) => goalsApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createGoal.mutate({
            ...form,
            target_amount: parseFloat(form.target_amount),
            saved_amount: parseFloat(form.saved_amount || "0"),
            monthly_contribution: parseFloat(form.monthly_contribution || "0"),
            interest_rate: form.is_loan ? parseFloat(form.interest_rate) : null,
            loan_term_months: form.is_loan ? parseInt(form.loan_term_months) : null,
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition"
                >
                    <Plus className="w-4 h-4" /> New Goal
                </button>
            </div>

            {/* New Goal Form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <h2 className="text-base font-semibold mb-4">Add New Goal</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { name: "goal_name", label: "Goal Name", placeholder: "e.g. Toyota Camry" },
                            { name: "target_amount", label: "Target $", placeholder: "20000" },
                            { name: "saved_amount", label: "Already Saved $", placeholder: "2000" },
                            { name: "monthly_contribution", label: "Monthly Savings $", placeholder: "300" },
                        ].map((f) => (
                            <div key={f.name}>
                                <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
                                <input
                                    required={f.name !== "saved_amount"}
                                    placeholder={f.placeholder}
                                    value={form[f.name as keyof GoalForm] as string}
                                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        ))}

                        <div className="sm:col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_loan"
                                checked={form.is_loan}
                                onChange={(e) => setForm({ ...form, is_loan: e.target.checked })}
                                className="accent-primary"
                            />
                            <label htmlFor="is_loan" className="text-sm text-gray-700">
                                I plan to finance (take a loan)
                            </label>
                        </div>

                        {form.is_loan && (
                            <>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Annual Interest Rate %</label>
                                    <input
                                        value={form.interest_rate}
                                        onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Loan Term (months)</label>
                                    <input
                                        value={form.loan_term_months}
                                        onChange={(e) => setForm({ ...form, loan_term_months: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </>
                        )}

                        <div className="sm:col-span-2 flex gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={createGoal.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                                {createGoal.isPending ? "Saving…" : "Save Goal"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Goal Cards */}
            {goals.length === 0 ? (
                <div className="text-center py-16 text-neutral">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No goals yet. Create one to start planning.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {goals.map((goal: any) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onUpdate={(data) => updateGoal.mutate({ id: goal.id, data })}
                            onDelete={() => deleteGoal.mutate(goal.id)}
                            isPending={updateGoal.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function GoalCard({ goal, onUpdate, onDelete, isPending }: {
    goal: any; onUpdate: (data: object) => void; onDelete: () => void; isPending: boolean;
}) {
    const pct = Math.min((parseFloat(goal.saved_amount) / parseFloat(goal.target_amount)) * 100, 100);
    const [showLog, setShowLog] = useState(false);
    const [logAmount, setLogAmount] = useState("");
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        goal_name: goal.goal_name || "",
        target_amount: String(goal.target_amount || ""),
        monthly_contribution: String(goal.monthly_contribution || ""),
    });

    const handleLogSavings = () => {
        const amount = parseFloat(logAmount);
        if (!amount || amount <= 0) return;
        const newSaved = parseFloat(goal.saved_amount || "0") + amount;
        onUpdate({ saved_amount: newSaved });
        setLogAmount("");
        setShowLog(false);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({
            goal_name: editForm.goal_name,
            target_amount: parseFloat(editForm.target_amount),
            monthly_contribution: parseFloat(editForm.monthly_contribution),
        });
        setShowEdit(false);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{goal.goal_name}</h3>
                    <p className="text-sm text-neutral">Target: ${parseFloat(goal.target_amount).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowEdit(!showEdit)} className="text-neutral hover:text-primary transition p-1" title="Edit goal">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="text-neutral hover:text-alert transition p-1" title="Delete goal">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Edit Form */}
            {showEdit && (
                <form onSubmit={handleEdit} className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    <input value={editForm.goal_name} onChange={(e) => setEditForm({ ...editForm, goal_name: e.target.value })}
                        placeholder="Goal name" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.target_amount} onChange={(e) => setEditForm({ ...editForm, target_amount: e.target.value })}
                            placeholder="Target $" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                        <input type="number" value={editForm.monthly_contribution} onChange={(e) => setEditForm({ ...editForm, monthly_contribution: e.target.value })}
                            placeholder="Monthly $" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEdit(false)} className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-white">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 text-xs bg-primary text-white rounded-lg py-1.5 hover:bg-primary-dark disabled:opacity-50">Save</button>
                    </div>
                </form>
            )}

            {/* Progress Bar */}
            <div className="h-3 bg-gray-200 rounded-full mb-2">
                <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-neutral mb-3">
                ${parseFloat(goal.saved_amount).toLocaleString()} saved · {pct.toFixed(0)}% complete
            </p>

            {/* Log Savings */}
            {showLog ? (
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={logAmount}
                        onChange={(e) => setLogAmount(e.target.value)}
                        placeholder="Amount saved"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        autoFocus
                    />
                    <button onClick={handleLogSavings} disabled={isPending}
                        className="bg-secondary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-secondary-dark disabled:opacity-50">
                        Add
                    </button>
                    <button onClick={() => setShowLog(false)} className="text-neutral hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button onClick={() => setShowLog(true)}
                    className="flex items-center gap-1 text-xs text-secondary font-medium hover:underline mb-3">
                    <DollarSign className="w-3 h-3" /> Log Savings
                </button>
            )}

            {/* Results */}
            <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3">
                {goal.months_to_goal && (
                    <p className="text-gray-700">
                        💰 Save up by: <strong>{goal.estimated_completion ? new Date(goal.estimated_completion).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</strong>
                        <span className="text-neutral ml-1">({goal.months_to_goal} months)</span>
                    </p>
                )}
                {goal.is_loan && goal.monthly_loan_payment && (
                    <p className="text-gray-700">
                        🏦 Loan payment: <strong>${parseFloat(goal.monthly_loan_payment).toFixed(2)}/mo</strong>
                        <span className="text-neutral ml-1">(${parseFloat(goal.total_interest || "0").toFixed(0)} total interest)</span>
                    </p>
                )}
                {goal.insight && (
                    <p className="text-xs text-secondary-dark bg-secondary/10 rounded-lg px-3 py-2 mt-2">{goal.insight}</p>
                )}
            </div>
        </div>
    );
}
