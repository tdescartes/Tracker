"use client";

import { useCallback, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankApi, api } from "@/lib/api";
import { useDropzone } from "react-dropzone";
import {
    FileText, UploadCloud, RefreshCw, Link2, Unlink, RefreshCcw, CheckCircle2,
    Filter, ArrowUpDown, Tag,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
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

export default function BankPage() {
    const qc = useQueryClient();
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [plaidAvailable, setPlaidAvailable] = useState<boolean | null>(null);
    const [linkingPlaid, setLinkingPlaid] = useState(false);
    const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    // Check if Plaid is configured
    useEffect(() => {
        api.post("/api/plaid/link-token").then(() => setPlaidAvailable(true)).catch((e) => {
            setPlaidAvailable(e?.response?.status !== 503);
        });
    }, []);

    const { data: transactions = [] } = useQuery({
        queryKey: ["bank-transactions"],
        queryFn: () => bankApi.transactions().then((r) => r.data),
    });

    const { data: linkedItems = [], refetch: refetchItems } = useQuery({
        queryKey: ["plaid-items"],
        queryFn: () => api.get("/api/plaid/linked-items").then((r) => r.data.items),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => bankApi.upload(file).then((r) => r.data),
        onSuccess: (data) => {
            setUploadResult(data);
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
        },
    });

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
        accept: {
            "application/pdf": [".pdf"],
            "text/csv": [".csv"],
            "image/*": [".jpg", ".jpeg", ".png"],
        },
        maxFiles: 1,
    });

    const handlePlaidLink = async () => {
        setLinkingPlaid(true);
        try {
            const { data } = await api.post("/api/plaid/link-token");
            await loadPlaidLink(data.link_token, async (publicToken: string) => {
                await api.post("/api/plaid/exchange-token", { public_token: publicToken });
                refetchItems();
            });
        } catch {
            alert("Plaid connection failed. Make sure PLAID_CLIENT_ID and PLAID_SECRET are set.");
        } finally {
            setLinkingPlaid(false);
        }
    };

    const handleSync = async (itemId: string) => {
        setSyncingItemId(itemId);
        try {
            await api.post("/api/plaid/sync", { item_id: itemId, days_back: 30 });
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
        } finally {
            setSyncingItemId(null);
        }
    };

    // Filtered transactions
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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Bank Statement Analyzer</h1>

            {/* ─── Phase 3: Plaid Live Bank Sync ─── */}
            {plaidAvailable !== false && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Link2 size={16} className="text-primary" />
                                Live Bank Connections
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Connect your bank directly via Plaid for automatic transaction sync.
                            </p>
                        </div>
                        <button
                            onClick={handlePlaidLink}
                            disabled={linkingPlaid || plaidAvailable === null}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Link2 size={14} />
                            {linkingPlaid ? "Connecting…" : "Connect Bank"}
                        </button>
                    </div>

                    {(linkedItems as any[]).length > 0 ? (
                        <div className="space-y-2">
                            {(linkedItems as any[]).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm text-gray-800">{item.institution_name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Last synced: {item.last_synced_at
                                                ? new Date(item.last_synced_at).toLocaleDateString()
                                                : "Never"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSync(item.item_id)}
                                            disabled={syncingItemId === item.item_id}
                                            className="flex items-center gap-1 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5"
                                        >
                                            <RefreshCcw size={12} className={syncingItemId === item.item_id ? "animate-spin" : ""} />
                                            {syncingItemId === item.item_id ? "Syncing…" : "Sync"}
                                        </button>
                                        <button
                                            onClick={() => unlinkMutation.mutate(item.id)}
                                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-alert border border-gray-200 px-3 py-1.5 rounded-lg"
                                        >
                                            <Unlink size={12} />
                                            Unlink
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-3">
                            No banks connected yet — click "Connect Bank" to link your account
                        </p>
                    )}
                </div>
            )}

            {/* ─── Statement Upload (PDF / CSV / Image) ─── */}
            <div>
                <h2 className="font-semibold text-gray-800 mb-3">Upload Statement</h2>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                        }`}
                >
                    <input {...getInputProps()} />
                    {uploadMutation.isPending ? (
                        <>
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            <p className="text-gray-700 font-medium">AI is analyzing your statement…</p>
                            <p className="text-sm text-neutral mt-1">PaddleOCR + Gemini pipeline</p>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-10 h-10 mx-auto mb-3 text-neutral" />
                            <p className="text-gray-700 font-medium">
                                {isDragActive ? "Drop it here!" : "Drag & drop a bank statement"}
                            </p>
                            <p className="text-sm text-neutral mt-1">
                                PDF, CSV, or photo (JPG / PNG) · Never stored, deleted after parsing
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Upload Result Panel */}
            {uploadResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-secondary" />
                            <p className="font-semibold text-gray-900">Import complete</p>
                        </div>
                        <div className="flex gap-2">
                            {uploadResult.parsing_method && (
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                                    {uploadResult.parsing_method}
                                </span>
                            )}
                            {uploadResult.bank_name && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                                    {uploadResult.bank_name}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-gray-700">{uploadResult.transactions_imported} transactions imported.</p>
                    {uploadResult.subscriptions_found?.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-medium text-alert mb-2">Recurring subscriptions detected:</p>
                            {uploadResult.subscriptions_found.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm text-gray-700 border-b border-gray-100 py-1 last:border-0">
                                    <span>{s.description}</span>
                                    <span className="text-alert font-medium">${Math.abs(s.amount).toFixed(2)}/mo</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {transactions.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard label="Transactions" value={filtered.length} />
                        <SummaryCard
                            label="Total Expenses"
                            value={`$${expenses.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}`}
                            accent="alert"
                        />
                        <SummaryCard
                            label="Total Income"
                            value={`$${income.reduce((s: number, t: any) => s + t.amount, 0).toFixed(2)}`}
                            accent="secondary"
                        />
                        <SummaryCard label="Categories" value={categories.length} accent="indigo" />
                    </div>

                    {/* Subscription Alert */}
                    {subscriptions.length > 0 && (
                        <div className="bg-orange-50 border border-alert/30 rounded-xl p-4">
                            <p className="font-semibold text-alert mb-2">
                                🔔 {subscriptions.length} recurring subscriptions
                            </p>
                            <div className="space-y-1">
                                {subscriptions.map((s: any) => (
                                    <div key={s.id} className="flex justify-between text-sm">
                                        <span>{s.description}</span>
                                        <span className="font-medium">${Math.abs(s.amount).toFixed(2)}/mo</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-neutral mt-2">
                                Total: ${subscriptions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}/mo — are you still using all of these?
                            </p>
                        </div>
                    )}

                    {/* Filters + Reconcile */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-neutral" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                            >
                                <option value="all">All types</option>
                                <option value="expense">Expenses</option>
                                <option value="income">Income</option>
                                <option value="subscription">Subscriptions</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tag size={14} className="text-neutral" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                            >
                                <option value="all">All categories</option>
                                {categories.sort().map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => reconcileMutation.mutate()}
                                disabled={reconcileMutation.isPending}
                                className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/5 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {reconcileMutation.isPending ? "Matching…" : "Match with Receipts"}
                            </button>
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Date", "Description", "Category", "Amount", "Source", "Status"].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-neutral">
                                            No transactions match current filters
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((tx: any) => {
                                        const cat = tx.category || "Other";
                                        const colorClass = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                                        return (
                                            <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-neutral whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    <span>{tx.description}</span>
                                                    {tx.is_subscription && (
                                                        <span className="ml-2 text-xs bg-orange-100 text-alert rounded px-1.5 py-0.5">
                                                            recurring
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}>
                                                        {cat}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tx.is_income ? "text-secondary" : "text-gray-800"}`}>
                                                    {tx.is_income ? "+" : ""}
                                                    {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${tx.source === "plaid"
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-gray-100 text-gray-600"
                                                        }`}>
                                                        {tx.source || "upload"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.linked_receipt_id ? (
                                                        <span className="text-xs text-secondary font-medium">✓ Matched</span>
                                                    ) : (
                                                        <span className="text-xs text-neutral">—</span>
                                                    )}
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

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    const colorMap: Record<string, string> = {
        alert: "text-alert",
        secondary: "text-secondary",
        indigo: "text-indigo-600",
    };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-neutral mb-1">{label}</p>
            <p className={`text-xl font-bold ${colorMap[accent || ""] || "text-gray-900"}`}>{value}</p>
        </div>
    );
}

// Dynamically inject Plaid Link and open it
async function loadPlaidLink(linkToken: string, onSuccess: (publicToken: string) => void) {
    return new Promise<void>((resolve, reject) => {
        if ((window as any).Plaid) {
            openPlaidLink(linkToken, onSuccess, resolve, reject);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        script.onload = () => openPlaidLink(linkToken, onSuccess, resolve, reject);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function openPlaidLink(
    token: string,
    onSuccess: (pt: string) => void,
    resolve: () => void,
    reject: (e: any) => void,
) {
    const handler = (window as any).Plaid.create({
        token,
        onSuccess: (publicToken: string) => { onSuccess(publicToken); resolve(); },
        onExit: (err: any) => { if (err) reject(err); else resolve(); },
    });
    handler.open();
}
