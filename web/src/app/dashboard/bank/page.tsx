"use client";

import { useCallback, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankApi, api } from "@/lib/api";
import { useDropzone } from "react-dropzone";
import {
    FileText, UploadCloud, RefreshCw, Link2, Unlink, RefreshCcw, CheckCircle2,
} from "lucide-react";

export default function BankPage() {
    const qc = useQueryClient();
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [plaidAvailable, setPlaidAvailable] = useState<boolean | null>(null);
    const [linkingPlaid, setLinkingPlaid] = useState(false);
    const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

    // Check if Plaid is configured
    useEffect(() => {
        api.post("/plaid/link-token").then(() => setPlaidAvailable(true)).catch((e) => {
            setPlaidAvailable(e?.response?.status !== 503);
        });
    }, []);

    const { data: transactions = [] } = useQuery({
        queryKey: ["bank-transactions"],
        queryFn: () => bankApi.transactions().then((r) => r.data),
    });

    const { data: linkedItems = [], refetch: refetchItems } = useQuery({
        queryKey: ["plaid-items"],
        queryFn: () => api.get("/plaid/linked-items").then((r) => r.data.items),
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
        mutationFn: (id: string) => api.delete(`/plaid/items/${id}`),
        onSuccess: () => refetchItems(),
    });

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) uploadMutation.mutate(files[0]);
    }, [uploadMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"], "text/csv": [".csv"] },
        maxFiles: 1,
    });

    const handlePlaidLink = async () => {
        setLinkingPlaid(true);
        try {
            const { data } = await api.post("/plaid/link-token");
            // Dynamically load Plaid Link script
            await loadPlaidLink(data.link_token, async (publicToken: string) => {
                await api.post("/plaid/exchange-token", { public_token: publicToken });
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
            await api.post("/plaid/sync", { item_id: itemId, days_back: 30 });
            qc.invalidateQueries({ queryKey: ["bank-transactions"] });
        } finally {
            setSyncingItemId(null);
        }
    };

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

            {/* ─── PDF / CSV Upload ─── */}
            <div>
                <h2 className="font-semibold text-gray-800 mb-3">Upload Statement</h2>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                        }`}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="w-10 h-10 mx-auto mb-3 text-neutral" />
                    <p className="text-gray-700 font-medium">
                        {uploadMutation.isPending
                            ? "Processing…"
                            : isDragActive
                                ? "Drop it here!"
                                : "Drag & drop a bank statement"}
                    </p>
                    <p className="text-sm text-neutral mt-1">
                        PDF or CSV · Never stored, deleted after parsing
                    </p>
                </div>
            </div>

            {/* Import Result */}
            {uploadResult && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={16} className="text-secondary" />
                        <p className="font-semibold text-gray-900">Import complete</p>
                    </div>
                    <p className="text-sm text-gray-700">{uploadResult.transactions_imported} transactions imported.</p>
                    {uploadResult.subscriptions_found?.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-alert mb-2">Recurring subscriptions found:</p>
                            {uploadResult.subscriptions_found.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm text-gray-700 border-b py-1 last:border-0">
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
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <SummaryCard label="Transactions" value={transactions.length} />
                        <SummaryCard label="Total Expenses" value={`$${expenses.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}`} accent="alert" />
                        <SummaryCard label="Total Income" value={`$${income.reduce((s: number, t: any) => s + t.amount, 0).toFixed(2)}`} accent="secondary" />
                    </div>

                    {/* Subscription Alert */}
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
                            <p className="text-xs text-neutral mt-2">
                                Total: ${subscriptions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}/mo — are you still using all of these?
                            </p>
                        </div>
                    )}

                    {/* Reconcile */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => reconcileMutation.mutate()}
                            disabled={reconcileMutation.isPending}
                            className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/5 transition"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {reconcileMutation.isPending ? "Matching…" : "Match with Receipts"}
                        </button>
                    </div>

                    {/* Transaction Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Date", "Description", "Amount", "Status"].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx: any) => (
                                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-neutral">{tx.date}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {tx.description}
                                            {tx.is_subscription && (
                                                <span className="ml-2 text-xs bg-orange-100 text-alert rounded px-1.5 py-0.5">recurring</span>
                                            )}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${tx.is_income ? "text-secondary" : "text-gray-800"}`}>
                                            {tx.is_income ? "+" : ""}{tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tx.linked_receipt_id ? (
                                                <span className="text-xs text-secondary font-medium">✓ Matched</span>
                                            ) : (
                                                <span className="text-xs text-neutral">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-neutral mb-1">{label}</p>
            <p className={`text-xl font-bold ${accent === "alert" ? "text-alert" : accent === "secondary" ? "text-secondary" : "text-gray-900"}`}>
                {value}
            </p>
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


const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => bankApi.transactions().then((r) => r.data),
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

const onDrop = useCallback((files: File[]) => {
    if (files[0]) uploadMutation.mutate(files[0]);
}, [uploadMutation]);

const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/pdf": [".pdf"] }, maxFiles: 1 });

const subscriptions = transactions.filter((t: any) => t.is_subscription);
const income = transactions.filter((t: any) => t.is_income);
const expenses = transactions.filter((t: any) => !t.is_income);

return (
    <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bank Statement Analyzer</h1>

        {/* Dropzone */}
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer mb-6 transition ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}`}
        >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 mx-auto mb-3 text-neutral" />
            <p className="text-gray-700 font-medium">
                {uploadMutation.isPending ? "Processing PDF…" : isDragActive ? "Drop it here!" : "Drag & drop your bank statement PDF"}
            </p>
            <p className="text-sm text-neutral mt-1">or click to browse · PDF only · Never stored, processed locally</p>
        </div>

        {/* Import Result */}
        {uploadResult && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <p className="font-semibold text-gray-900 mb-2">Import complete</p>
                <p className="text-sm text-gray-700">{uploadResult.transactions_imported} transactions imported.</p>
                {uploadResult.subscriptions_found?.length > 0 && (
                    <div className="mt-3">
                        <p className="text-sm font-medium text-alert mb-2">Recurring subscriptions found:</p>
                        {uploadResult.subscriptions_found.map((s: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm text-gray-700 border-b py-1 last:border-0">
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
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <SummaryCard label="Transactions" value={transactions.length} />
                    <SummaryCard label="Total Expenses" value={`$${expenses.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}`} accent="alert" />
                    <SummaryCard label="Total Income" value={`$${income.reduce((s: number, t: any) => s + t.amount, 0).toFixed(2)}`} accent="secondary" />
                </div>

                {/* Subscription Alert */}
                {subscriptions.length > 0 && (
                    <div className="bg-orange-50 border border-alert/30 rounded-xl p-4 mb-6">
                        <p className="font-semibold text-alert mb-2">🔔 {subscriptions.length} recurring subscriptions</p>
                        <div className="space-y-1">
                            {subscriptions.map((s: any) => (
                                <div key={s.id} className="flex justify-between text-sm">
                                    <span>{s.description}</span>
                                    <span className="font-medium">${Math.abs(s.amount).toFixed(2)}/mo</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-neutral mt-2">
                            Total: ${subscriptions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0).toFixed(2)}/month — do you still use all of these?
                        </p>
                    </div>
                )}

                {/* Reconcile Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => reconcileMutation.mutate()}
                        disabled={reconcileMutation.isPending}
                        className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm hover:bg-primary/5 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {reconcileMutation.isPending ? "Matching…" : "Match with Receipts"}
                    </button>
                </div>

                {/* Transaction Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Date", "Description", "Amount", "Status"].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx: any) => (
                                <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-neutral">{tx.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {tx.description}
                                        {tx.is_subscription && <span className="ml-2 text-xs bg-orange-100 text-alert rounded px-1.5 py-0.5">recurring</span>}
                                    </td>
                                    <td className={`px-4 py-3 font-semibold ${tx.is_income ? "text-secondary" : "text-gray-800"}`}>
                                        {tx.is_income ? "+" : ""}{tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-3">
                                        {tx.linked_receipt_id ? (
                                            <span className="text-xs text-secondary font-medium">✓ Matched</span>
                                        ) : (
                                            <span className="text-xs text-neutral">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}
    </div>
);
}

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-neutral mb-1">{label}</p>
            <p className={`text-xl font-bold ${accent === "alert" ? "text-alert" : accent === "secondary" ? "text-secondary-dark" : "text-gray-900"}`}>
                {value}
            </p>
        </div>
    );
}
