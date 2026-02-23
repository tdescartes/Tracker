"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetApi, bankApi, goalsApi, api, insightsApi } from "@/lib/api";
import { useDropzone } from "react-dropzone";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
    Wallet, TrendingUp, Target, UploadCloud, RefreshCw, CheckCircle2,
    Filter, Tag, Plus, Pencil, Trash2, DollarSign, X, Link2, Unlink, RefreshCcw, ArrowRight,
} from "lucide-react";
import clsx from "clsx";
import { BudgetSkeleton, TransactionsSkeleton, GoalsSkeleton } from "@/components/Skeleton";

// ── Shared config ────────────────────────────────────────────
const CATEGORY_COLORS = [
    "#006994", "#87A96B", "#EC5800", "#708090", "#f59e0b",
    "#6366f1", "#ec4899", "#10b981",
];
const TX_CAT_COLORS: Record<string, string> = {
    Groceries: "bg-green-100 text-green-700",
    Dining: "bg-orange-100 text-orange-700",
    Transport: "bg-blue-100 text-blue-700",
    Utilities: "bg-yellow-100 text-yellow-700",
    Entertainment: "bg-purple-100 text-purple-700",
    Shopping: "bg-pink-100 text-pink-700",
    Healthcare: "bg-red-100 text-red-700",
    Subscriptions: "bg-indigo-100 text-indigo-700",
    Income: "bg-emerald-100 text-emerald-700",
    Transfer: "bg-gray-100 text-gray-700",
    Other: "bg-gray-100 text-gray-600",
};

type Tab = "budget" | "transactions" | "goals";

/* ─── Elapsed-time hook ─── */
function useElapsedSeconds(running: boolean) {
    const [elapsed, setElapsed] = useState(0);
    const ref = useRef<ReturnType<typeof setInterval>>(undefined);
    useEffect(() => {
        if (running) { setElapsed(0); ref.current = setInterval(() => setElapsed((s) => s + 1), 1000); }
        else clearInterval(ref.current);
        return () => clearInterval(ref.current);
    }, [running]);
    return elapsed;
}

function progressMsg(s: number) {
    if (s < 3) return "Uploading…";
    if (s < 8) return "Extracting text…";
    if (s < 20) return "AI parsing…";
    if (s < 40) return "Structuring data…";
    return "Still working…";
}

// ═══════════════════════════════════════════════════════════════
export default function MoneyPage() {
    const [tab, setTab] = useState<Tab>("budget");

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Money</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                {([
                    { key: "budget", label: "Budget", icon: Wallet },
                    { key: "transactions", label: "Transactions", icon: TrendingUp },
                    { key: "goals", label: "Goals", icon: Target },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
                            tab === key
                                ? "bg-white text-primary shadow-sm"
                                : "text-neutral hover:text-gray-800"
                        )}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {tab === "budget" && <BudgetSegment />}
            {tab === "transactions" && <TransactionsSegment />}
            {tab === "goals" && <GoalsSegment />}
        </div>
    );
}

// ════════════════ BUDGET ════════════════════════════════════
function BudgetSegment() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [limit, setLimit] = useState(600);
    const [inflationItem, setInflationItem] = useState("milk");
    const [searchedItem, setSearchedItem] = useState<string | null>(null);

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ["budget", year, month, limit],
        queryFn: () => budgetApi.summary(year, month, limit).then((r) => r.data),
    });

    const { data: reportCard, isLoading: reportLoading } = useQuery({
        queryKey: ["report-card", year, month],
        queryFn: () => budgetApi.reportCard(year, month).then((r) => r.data),
    });

    const { data: inflationData } = useQuery({
        queryKey: ["inflation", searchedItem],
        queryFn: () => budgetApi.inflation(searchedItem!).then((r) => r.data),
        enabled: !!searchedItem,
    });

    const pieData = Object.entries(summary?.by_category ?? {}).map(([name, value]) => ({
        name, value: parseFloat(value as string),
    }));
    // Merge bank categories for a combined view
    const bankCatData = Object.entries(summary?.bank_category_breakdown ?? {}).map(([name, value]) => ({
        name: `${name} (bank)`, value: parseFloat(value as string),
    }));
    const allPieData = [...pieData, ...bankCatData].filter((d) => d.value > 0);

    const confirmed = parseFloat(summary?.confirmed_spent ?? "0");
    const estimated = parseFloat(summary?.estimated_spent ?? "0");
    const spent = parseFloat(summary?.total_spent ?? "0");
    const pct = Math.min((spent / limit) * 100, 100);
    const confirmedPct = Math.min((confirmed / limit) * 100, 100);
    const estimatedPct = Math.min((estimated / limit) * 100, pct - confirmedPct);
    const hasEstimated = estimated > 0;
    const remaining = parseFloat(summary?.remaining ?? "0");
    const dailyPace = parseFloat(summary?.daily_pace ?? "0");
    const onTrack = summary?.on_track ?? true;

    // Pace
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : daysInMonth;
    const daysLeft = daysInMonth - dayOfMonth;
    const dailyBudget = daysLeft > 0 ? (limit - spent) / daysLeft : 0;

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral">Month:</label>
                    <select value={month} onChange={(e) => setMonth(+e.target.value)}
                        title="Month" className="border border-gray-300 rounded px-2 py-1 text-sm">
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(2026, i, 1).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </select>
                    <input type="number" value={year} onChange={(e) => setYear(+e.target.value)}
                        title="Year" className="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral">Limit: $</label>
                    <input type="number" value={limit} onChange={(e) => setLimit(+e.target.value)}
                        title="Budget limit" className="border border-gray-300 rounded px-2 py-1 text-sm w-24" />
                </div>
            </div>

            {summaryLoading && reportLoading ? (
                <BudgetSkeleton />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Honest Budget Card ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold">Spending vs Budget</h2>
                        {!onTrack && (
                            <span className="text-xs bg-red-50 text-alert px-2 py-1 rounded-full font-medium">Over pace</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Total: <strong>{hasEstimated ? "~" : ""}${spent.toFixed(2)}</strong></span>
                            <span>Limit: <strong>${limit.toFixed(2)}</strong></span>
                        </div>
                        {/* Stacked progress bar */}
                        <div className="h-5 bg-gray-200 rounded-full overflow-hidden flex">
                            <div className={`h-full transition-all ${confirmedPct + estimatedPct > 90 ? "bg-alert" : confirmedPct + estimatedPct > 70 ? "bg-yellow-400" : "bg-secondary"}`}
                                style={{ width: `${confirmedPct}%` }}
                                title={`Confirmed: $${confirmed.toFixed(2)}`} />
                            {hasEstimated && (
                                <div className="h-full transition-all bg-secondary/40"
                                    style={{ width: `${estimatedPct}%`, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)" }}
                                    title={`Estimated: ~$${estimated.toFixed(2)}`} />
                            )}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs text-neutral mt-1">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-secondary inline-block" /> Confirmed: ${confirmed.toFixed(2)}
                            </span>
                            {hasEstimated && (
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded bg-secondary/40 inline-block" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)" }} /> Est: ~${estimated.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-neutral">{pct.toFixed(0)}% used</span>
                            <span className={remaining < 0 ? "text-alert font-semibold" : "text-secondary"}>
                                {hasEstimated ? "~" : ""}${Math.abs(remaining).toFixed(2)} {remaining < 0 ? "over budget" : "remaining"}
                            </span>
                        </div>
                        {/* Pace indicator */}
                        <div className="flex justify-between text-xs mt-1 pt-2 border-t border-gray-100">
                            <span className={!onTrack ? "text-alert font-semibold" : "text-neutral"}>
                                {onTrack ? "✓" : "⚠"} ${dailyPace.toFixed(2)}/day pace
                            </span>
                            {dailyBudget > 0 && (
                                <span className="text-primary font-medium">
                                    ${dailyBudget.toFixed(2)}/day budget left
                                </span>
                            )}
                        </div>
                        {hasEstimated && (
                            <p className="text-xs text-neutral mt-2 bg-blue-50 px-3 py-2 rounded-lg">
                                ℹ Confirmed = from scanned receipts. Estimated = from bank transactions not yet matched to a receipt.
                            </p>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                        <span className="text-neutral">Food waste:</span>
                        <span className="text-alert font-medium">${parseFloat(summary?.waste_cost ?? "0").toFixed(2)}</span>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-base font-semibold mb-4">Spending by Category</h2>
                    {allPieData.length === 0 ? (
                        <p className="text-neutral text-sm text-center py-8">No data.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={allPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {allPieData.map((_, i) => (
                                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* ── Monthly Report Card ── */}
                {reportCard && (parseFloat(reportCard.income) > 0 || parseFloat(reportCard.expenses) > 0) && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            📊 Monthly Report Card
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <p className="text-xs text-neutral mb-1">Income</p>
                                <p className="text-lg font-bold text-secondary">${parseFloat(reportCard.income).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-neutral mb-1">Expenses</p>
                                <p className="text-lg font-bold text-gray-900">${parseFloat(reportCard.expenses).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-neutral mb-1">Net</p>
                                <p className={`text-lg font-bold ${parseFloat(reportCard.net) >= 0 ? "text-secondary" : "text-alert"}`}>
                                    {parseFloat(reportCard.net) >= 0 ? "+" : ""}${parseFloat(reportCard.net).toLocaleString()}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-neutral mb-1">vs Last Month</p>
                                <p className={`text-lg font-bold ${parseFloat(reportCard.vs_last_month_expenses) > 0 ? "text-alert" : "text-secondary"}`}>
                                    {parseFloat(reportCard.vs_last_month_expenses) > 0 ? "↑" : "↓"} {Math.abs(parseFloat(reportCard.vs_last_month_pct)).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        {reportCard.biggest_increase_category && parseFloat(reportCard.biggest_increase_amount) > 0 && (
                            <p className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg mb-4">
                                Biggest increase: <strong>{reportCard.biggest_increase_category}</strong> (+${parseFloat(reportCard.biggest_increase_amount).toFixed(2)})
                            </p>
                        )}
                        {/* Subscriptions */}
                        {reportCard.subscriptions && reportCard.subscriptions.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">🔍 Recurring Subscriptions</h3>
                                <div className="space-y-1">
                                    {reportCard.subscriptions.map((s: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{s.description}</span>
                                            <span className="font-medium text-gray-900">${parseFloat(s.amount).toFixed(2)}/mo</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-gray-100">
                                    <span>Total subscriptions</span>
                                    <span>${parseFloat(reportCard.subscription_monthly_total).toFixed(2)}/mo · ${parseFloat(reportCard.subscription_annual_total).toFixed(0)}/yr</span>
                                </div>
                            </div>
                        )}
                        {/* Surplus indicator */}
                        {parseFloat(reportCard.surplus) > 0 && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                                💡 Surplus: <strong>${parseFloat(reportCard.surplus).toLocaleString()}</strong> available for savings goals.
                            </div>
                        )}
                    </div>
                )}

                {/* Inflation Tracker */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                    <h2 className="text-base font-semibold mb-4">Inflation Tracker</h2>
                    <div className="flex gap-3 mb-4">
                        <input value={inflationItem} onChange={(e) => setInflationItem(e.target.value)}
                            placeholder="e.g. milk, eggs, bread"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1" />
                        <button onClick={() => setSearchedItem(inflationItem)}
                            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-dark transition">
                            Track
                        </button>
                    </div>
                    {inflationData && inflationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={inflationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                                <Legend />
                                <Line type="monotone" dataKey="avg_price" stroke="#006994" strokeWidth={2} dot />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : searchedItem ? (
                        <p className="text-neutral text-sm text-center py-6">No price history for &ldquo;{searchedItem}&rdquo;.</p>
                    ) : null}
                </div>
            </div>
            )}
        </div>
    );
}

// ════════════════ TRANSACTIONS ══════════════════════════════
function TransactionsSegment() {
    const qc = useQueryClient();
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [postUploadReport, setPostUploadReport] = useState<any>(null);
    const [plaidAvailable, setPlaidAvailable] = useState<boolean | null>(null);
    const [linkingPlaid, setLinkingPlaid] = useState(false);
    const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    useEffect(() => {
        api.post("/api/plaid/link-token")
            .then(() => setPlaidAvailable(true))
            .catch((e) => setPlaidAvailable(e?.response?.status !== 503));
    }, []);

    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: ["bank-transactions"],
        queryFn: () => bankApi.transactions().then((r) => r.data),
    });
    const { data: linkedItems = [], refetch: refetchItems } = useQuery({
        queryKey: ["plaid-items"],
        queryFn: () => api.get("/api/plaid/linked-items").then((r) => r.data.items),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => bankApi.upload(file).then((r) => r.data),
        onSuccess: async (data) => {
            setUploadResult(data);
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
            qc.invalidateQueries({ queryKey: ["report-card"] });
            // Auto-fetch report card after upload
            try {
                const now = new Date();
                const rc = await budgetApi.reportCard(now.getFullYear(), now.getMonth() + 1).then((r) => r.data);
                setPostUploadReport(rc);
            } catch { /* best-effort */ }
        },
    });
    const elapsed = useElapsedSeconds(uploadMutation.isPending);

    const reconcileMutation = useMutation({
        mutationFn: () => bankApi.reconcile().then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-transactions"] }),
    });
    const unlinkMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/api/plaid/items/${id}`),
        onSuccess: () => refetchItems(),
    });

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) uploadMutation.mutate(files[0]);
    }, [uploadMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"], "text/csv": [".csv"], "image/*": [".jpg", ".jpeg", ".png"] },
        maxFiles: 1,
    });

    const handlePlaidLink = async () => {
        setLinkingPlaid(true);
        try {
            const { data } = await api.post("/api/plaid/link-token");
            await loadPlaidLink(data.link_token, async (pt: string) => {
                await api.post("/api/plaid/exchange-token", { public_token: pt });
                refetchItems();
            });
        } catch { alert("Plaid connection failed."); }
        finally { setLinkingPlaid(false); }
    };

    const handleSync = async (itemId: string) => {
        setSyncingItemId(itemId);
        try { await api.post("/api/plaid/sync", { item_id: itemId, days_back: 30 }); qc.invalidateQueries({ queryKey: ["bank-transactions"] }); }
        finally { setSyncingItemId(null); }
    };

    const filtered = transactions.filter((t: any) => {
        if (typeFilter === "income" && !t.is_income) return false;
        if (typeFilter === "expense" && t.is_income) return false;
        if (typeFilter === "subscription" && !t.is_subscription) return false;
        if (categoryFilter !== "all" && (t.category || "Other") !== categoryFilter) return false;
        return true;
    });
    const categories = [...new Set(transactions.map((t: any) => t.category || "Other"))] as string[];
    const subscriptions = transactions.filter((t: any) => t.is_subscription);
    const income = transactions.filter((t: any) => t.is_income);
    const expenses = transactions.filter((t: any) => !t.is_income);
    const matchedCount = transactions.filter((t: any) => t.linked_receipt_id).length;
    const unmatchedCount = expenses.length - transactions.filter((t: any) => !t.is_income && t.linked_receipt_id).length;

    return (
        <div className="space-y-6">
            {/* Plaid */}
            {plaidAvailable !== false && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Link2 size={16} className="text-primary" /> Live Bank Connections
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">Connect via Plaid for automatic sync.</p>
                        </div>
                        <button onClick={handlePlaidLink} disabled={linkingPlaid || plaidAvailable === null}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                            <Link2 size={14} /> {linkingPlaid ? "Connecting…" : "Connect Bank"}
                        </button>
                    </div>
                    {(linkedItems as any[]).length > 0 ? (
                        <div className="space-y-2">
                            {(linkedItems as any[]).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm text-gray-800">{item.institution_name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Last synced: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleDateString() : "Never"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleSync(item.item_id)} disabled={syncingItemId === item.item_id}
                                            className="flex items-center gap-1 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5">
                                            <RefreshCcw size={12} className={syncingItemId === item.item_id ? "animate-spin" : ""} />
                                            {syncingItemId === item.item_id ? "Syncing…" : "Sync"}
                                        </button>
                                        <button onClick={() => unlinkMutation.mutate(item.id)}
                                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-alert border border-gray-200 px-3 py-1.5 rounded-lg">
                                            <Unlink size={12} /> Unlink
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-3">No banks connected.</p>
                    )}
                </div>
            )}

            {/* Upload */}
            <div>
                <h2 className="font-semibold text-gray-800 mb-3">Upload Statement</h2>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}`}>
                    <input {...getInputProps()} />
                    {uploadMutation.isPending ? (
                        <>
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            <p className="text-gray-700 font-medium">{progressMsg(elapsed)}</p>
                            <p className="text-sm text-neutral mt-1">{elapsed}s elapsed</p>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-10 h-10 mx-auto mb-3 text-neutral" />
                            <p className="text-gray-700 font-medium">{isDragActive ? "Drop it here!" : "Drag & drop a bank statement"}</p>
                            <p className="text-sm text-neutral mt-1">PDF, CSV, or photo</p>
                        </>
                    )}
                </div>
            </div>

            {uploadMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    <p className="font-medium">Upload failed</p>
                    <p className="mt-1">{(uploadMutation.error as any)?.response?.data?.detail || "Please try again."}</p>
                </div>
            )}

            {uploadResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-secondary" />
                        <p className="font-semibold text-gray-900">Import complete</p>
                        {uploadResult.bank_name && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{uploadResult.bank_name}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{uploadResult.transactions_imported} transactions imported.</p>
                    {uploadResult.subscriptions_found?.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-medium text-alert mb-2">Recurring subscriptions:</p>
                            {uploadResult.subscriptions_found.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm text-gray-700 border-b border-gray-100 py-1 last:border-0">
                                    <span>{s.description}</span>
                                    <span className="text-alert font-medium">${Math.abs(s.amount).toFixed(2)}/mo</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Post-Upload Report Card ── */}
                    {postUploadReport && (parseFloat(postUploadReport.income) > 0 || parseFloat(postUploadReport.expenses) > 0) && (
                        <div className="border-t border-gray-100 pt-4 mt-3">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                                📊 Monthly Report Card
                            </h3>
                            <div className="grid grid-cols-4 gap-3 mb-3">
                                <div className="text-center bg-green-50 rounded-lg p-2">
                                    <p className="text-[10px] text-neutral">Income</p>
                                    <p className="text-sm font-bold text-secondary">${parseFloat(postUploadReport.income).toLocaleString()}</p>
                                </div>
                                <div className="text-center bg-gray-50 rounded-lg p-2">
                                    <p className="text-[10px] text-neutral">Expenses</p>
                                    <p className="text-sm font-bold text-gray-900">${parseFloat(postUploadReport.expenses).toLocaleString()}</p>
                                </div>
                                <div className={`text-center rounded-lg p-2 ${parseFloat(postUploadReport.net) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                                    <p className="text-[10px] text-neutral">Net</p>
                                    <p className={`text-sm font-bold ${parseFloat(postUploadReport.net) >= 0 ? "text-secondary" : "text-alert"}`}>
                                        {parseFloat(postUploadReport.net) >= 0 ? "+" : ""}${parseFloat(postUploadReport.net).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-center bg-purple-50 rounded-lg p-2">
                                    <p className="text-[10px] text-neutral">vs Last</p>
                                    <p className={`text-sm font-bold ${parseFloat(postUploadReport.vs_last_month_expenses) > 0 ? "text-alert" : "text-secondary"}`}>
                                        {parseFloat(postUploadReport.vs_last_month_expenses) > 0 ? "↑" : "↓"}{Math.abs(parseFloat(postUploadReport.vs_last_month_pct)).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                            {parseFloat(postUploadReport.surplus) > 0 && (
                                <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                                    💰 Surplus: ${parseFloat(postUploadReport.surplus).toLocaleString()} — consider moving it to a savings goal!
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {txLoading && transactions.length === 0 && !uploadMutation.isPending ? (
                <TransactionsSkeleton />
            ) : null}

            {transactions.length > 0 && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard label="Transactions" value={filtered.length} />
                        <SummaryCard label="Expenses" value={`$${expenses.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}`} accent="alert" />
                        <SummaryCard label="Income" value={`$${income.reduce((s: number, t: any) => s + t.amount, 0).toFixed(2)}`} accent="secondary" />
                        <SummaryCard label="Categories" value={categories.length} accent="indigo" />
                    </div>

                    {/* Unmatched transactions summary */}
                    {expenses.length > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                    <span className="text-sm text-gray-700">{matchedCount} matched</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                    <span className="text-sm text-gray-700">{unmatchedCount} unmatched</span>
                                </div>
                            </div>
                            {unmatchedCount > 0 && (
                                <p className="text-xs text-blue-600">
                                    {unmatchedCount} expense{unmatchedCount !== 1 ? "s" : ""} without a receipt — scan receipts to match them
                                </p>
                            )}
                        </div>
                    )}

                    {subscriptions.length > 0 && (
                        <div className="bg-orange-50 border border-alert/30 rounded-xl p-4">
                            <p className="font-semibold text-alert mb-2">🔔 {subscriptions.length} recurring subscriptions</p>
                            <div className="space-y-1">
                                {subscriptions.map((s: any) => (
                                    <div key={s.id} className="flex justify-between text-sm">
                                        <span>{s.description}</span>
                                        <span className="font-medium">${Math.abs(s.amount).toFixed(2)}/mo</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-neutral" />
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                                title="Filter by type" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                                <option value="all">All types</option>
                                <option value="expense">Expenses</option>
                                <option value="income">Income</option>
                                <option value="subscription">Subscriptions</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tag size={14} className="text-neutral" />
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                                title="Filter by category" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                                <option value="all">All categories</option>
                                {categories.sort().map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="ml-auto">
                            <button onClick={() => reconcileMutation.mutate()} disabled={reconcileMutation.isPending}
                                className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/5 transition">
                                <RefreshCw className="w-4 h-4" />
                                {reconcileMutation.isPending ? "Matching…" : "Match with Receipts"}
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Date", "Description", "Category", "Amount", "Source", "Status"].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral">No matches</td></tr>
                                ) : (
                                    filtered.map((tx: any) => {
                                        const cat = tx.category || "Other";
                                        return (
                                            <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-neutral whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    {tx.description}
                                                    {tx.is_subscription && <span className="ml-2 text-xs bg-orange-100 text-alert rounded px-1.5 py-0.5">recurring</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TX_CAT_COLORS[cat] || TX_CAT_COLORS.Other}`}>{cat}</span>
                                                </td>
                                                <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tx.is_income ? "text-secondary" : "text-gray-800"}`}>
                                                    {tx.is_income ? "+" : ""}{tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${tx.source === "plaid" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
                                                        {tx.source || "upload"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.linked_receipt_id ? <span className="text-xs text-secondary font-medium">✓ Matched</span> : <span className="text-xs text-neutral">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ════════════════ GOALS ═════════════════════════════════════
interface GoalForm {
    goal_name: string; target_amount: string; saved_amount: string;
    monthly_contribution: string; is_loan: boolean; interest_rate: string; loan_term_months: string;
}
const defaultForm: GoalForm = { goal_name: "", target_amount: "", saved_amount: "0", monthly_contribution: "300", is_loan: false, interest_rate: "5.0", loan_term_months: "60" };

function GoalsSegment() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<GoalForm>(defaultForm);
    const now = new Date();

    const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ["goals"], queryFn: () => goalsApi.list().then((r) => r.data) });
    const { data: surplusData } = useQuery({
        queryKey: ["surplus", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.surplus(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });
    const createGoal = useMutation({
        mutationFn: (d: object) => goalsApi.create(d),
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
                <h2 className="text-lg font-semibold text-gray-900">Savings Goals</h2>
                <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition">
                    <Plus className="w-4 h-4" /> New Goal
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <h3 className="text-base font-semibold mb-4">Add New Goal</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { name: "goal_name", label: "Name", placeholder: "e.g. Toyota Camry" },
                            { name: "target_amount", label: "Target $", placeholder: "20000" },
                            { name: "saved_amount", label: "Already Saved $", placeholder: "2000" },
                            { name: "monthly_contribution", label: "Monthly $", placeholder: "300" },
                        ].map((f) => (
                            <div key={f.name}>
                                <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
                                <input required={f.name !== "saved_amount"} placeholder={f.placeholder}
                                    value={form[f.name as keyof GoalForm] as string}
                                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        ))}
                        <div className="sm:col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="is_loan" checked={form.is_loan} onChange={(e) => setForm({ ...form, is_loan: e.target.checked })} className="accent-primary" />
                            <label htmlFor="is_loan" className="text-sm text-gray-700">I plan to finance</label>
                        </div>
                        {form.is_loan && (
                            <>
                                <div><label className="block text-sm text-gray-700 mb-1">Interest Rate %</label>
                                    <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} placeholder="e.g. 5.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="block text-sm text-gray-700 mb-1">Term (months)</label>
                                    <input value={form.loan_term_months} onChange={(e) => setForm({ ...form, loan_term_months: e.target.value })} placeholder="e.g. 60" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
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

            {goals.length === 0 && !goalsLoading ? (
                <div className="text-center py-16 text-neutral">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No goals yet.</p>
                </div>
            ) : goalsLoading ? (
                <GoalsSkeleton />
            ) : (
                <>
                    {/* Surplus banner */}
                    {surplusData && parseFloat(surplusData.surplus) > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                            <p className="text-sm font-semibold text-green-800">
                                💰 Monthly surplus: ~${parseFloat(surplusData.surplus).toLocaleString()}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                Based on ${parseFloat(surplusData.income).toLocaleString()} income − ${parseFloat(surplusData.total_expenses).toLocaleString()} expenses.
                                {surplusData.top_cuttable?.length > 0 && (
                                    <> Top cuttable: {surplusData.top_cuttable[0].category} (${surplusData.top_cuttable[0].amount.toFixed(0)}/mo)</>
                                )}
                            </p>
                            {goals.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {goals.map((g: any) => {
                                        const remaining = parseFloat(g.target_amount) - parseFloat(g.saved_amount);
                                        if (remaining <= 0) return null;
                                        const moveAmt = Math.min(parseFloat(surplusData.surplus), remaining);
                                        return (
                                            <button
                                                key={g.id}
                                                onClick={() => updateGoal.mutate({ id: g.id, data: { saved_amount: parseFloat(g.saved_amount) + moveAmt } })}
                                                disabled={updateGoal.isPending}
                                                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                            >
                                                <ArrowRight size={12} />
                                                Move ${moveAmt.toFixed(0)} → {g.goal_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {goals.map((goal: any) => (
                            <GoalCard key={goal.id} goal={goal}
                                onUpdate={(d) => updateGoal.mutate({ id: goal.id, data: d })}
                                onDelete={() => deleteGoal.mutate(goal.id)}
                                isPending={updateGoal.isPending}
                                monthlySurplus={surplusData ? parseFloat(surplusData.surplus) : undefined} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function GoalCard({ goal, onUpdate, onDelete, isPending, monthlySurplus }: {
    goal: any; onUpdate: (d: object) => void; onDelete: () => void; isPending: boolean; monthlySurplus?: number;
}) {
    const pct = Math.min((parseFloat(goal.saved_amount) / parseFloat(goal.target_amount)) * 100, 100);
    const [showLog, setShowLog] = useState(false);
    const [logAmount, setLogAmount] = useState("");
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        goal_name: goal.goal_name || "", target_amount: String(goal.target_amount || ""), monthly_contribution: String(goal.monthly_contribution || ""),
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{goal.goal_name}</h3>
                    <p className="text-sm text-neutral">Target: ${parseFloat(goal.target_amount).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowEdit(!showEdit)} className="text-neutral hover:text-primary transition p-1" title="Edit goal"><Pencil className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="text-neutral hover:text-alert transition p-1" title="Delete goal"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            {showEdit && (
                <form onSubmit={(e) => { e.preventDefault(); onUpdate({ goal_name: editForm.goal_name, target_amount: parseFloat(editForm.target_amount), monthly_contribution: parseFloat(editForm.monthly_contribution) }); setShowEdit(false); }}
                    className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    <input value={editForm.goal_name} onChange={(e) => setEditForm({ ...editForm, goal_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="Goal name" />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.target_amount} onChange={(e) => setEditForm({ ...editForm, target_amount: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="Target amount" />
                        <input type="number" value={editForm.monthly_contribution} onChange={(e) => setEditForm({ ...editForm, monthly_contribution: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="Monthly contribution" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEdit(false)} className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-white">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 text-xs bg-primary text-white rounded-lg py-1.5 disabled:opacity-50">Save</button>
                    </div>
                </form>
            )}
            <div className="h-3 bg-gray-200 rounded-full mb-2">
                <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-neutral mb-3">${parseFloat(goal.saved_amount).toLocaleString()} saved · {pct.toFixed(0)}%</p>
            {showLog ? (
                <div className="flex items-center gap-2 mb-3">
                    <input type="number" value={logAmount} onChange={(e) => setLogAmount(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm" autoFocus placeholder="Amount" />
                    <button onClick={() => { const a = parseFloat(logAmount); if (a > 0) { onUpdate({ saved_amount: parseFloat(goal.saved_amount || "0") + a }); setLogAmount(""); setShowLog(false); } }}
                        disabled={isPending} className="bg-secondary text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">Add</button>
                    <button onClick={() => setShowLog(false)} className="text-neutral hover:text-gray-600" title="Cancel"><X className="w-4 h-4" /></button>
                </div>
            ) : (
                <button onClick={() => setShowLog(true)} className="flex items-center gap-1 text-xs text-secondary font-medium hover:underline mb-3">
                    <DollarSign className="w-3 h-3" /> Log Savings
                </button>
            )}
            <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3">
                {goal.months_to_goal && (
                    <p className="text-gray-700">💰 {goal.estimated_completion ? new Date(goal.estimated_completion).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"} <span className="text-neutral">({goal.months_to_goal} mo)</span></p>
                )}
                {goal.is_loan && goal.monthly_loan_payment && (
                    <p className="text-gray-700">🏦 ${parseFloat(goal.monthly_loan_payment).toFixed(2)}/mo <span className="text-neutral">(${parseFloat(goal.total_interest || "0").toFixed(0)} interest)</span></p>
                )}
                {goal.insight && <p className="text-xs text-secondary-dark bg-secondary/10 rounded-lg px-3 py-2 mt-2">{goal.insight}</p>}
                {monthlySurplus && monthlySurplus > 0 && (() => {
                    const remaining = parseFloat(goal.target_amount) - parseFloat(goal.saved_amount);
                    if (remaining <= 0) return null;
                    const monthsWithSurplus = Math.ceil(remaining / monthlySurplus);
                    const surplusDate = new Date();
                    surplusDate.setMonth(surplusDate.getMonth() + monthsWithSurplus);
                    return (
                        <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">
                            💰 With your ~${monthlySurplus.toLocaleString()}/mo surplus: reach goal by {surplusDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} ({monthsWithSurplus} mo)
                        </p>
                    );
                })()}
            </div>
        </div>
    );
}

// ── Shared components ────────────────────────────────────────
function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    const c: Record<string, string> = { alert: "text-alert", secondary: "text-secondary", indigo: "text-indigo-600" };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-neutral mb-1">{label}</p>
            <p className={`text-xl font-bold ${c[accent || ""] || "text-gray-900"}`}>{value}</p>
        </div>
    );
}

// ── Plaid Link loader ────────────────────────────────────────
async function loadPlaidLink(linkToken: string, onSuccess: (pt: string) => void) {
    return new Promise<void>((resolve, reject) => {
        if ((window as any).Plaid) { openPlaidLink(linkToken, onSuccess, resolve, reject); return; }
        const s = document.createElement("script");
        s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        s.onload = () => openPlaidLink(linkToken, onSuccess, resolve, reject);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
function openPlaidLink(token: string, onSuccess: (pt: string) => void, resolve: () => void, reject: (e: any) => void) {
    const handler = (window as any).Plaid.create({
        token,
        onSuccess: (pt: string) => { onSuccess(pt); resolve(); },
        onExit: (err: any) => { if (err) reject(err); else resolve(); },
    });
    handler.open();
}
