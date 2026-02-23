"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { receiptApi, budgetApi, insightsApi } from "@/lib/api";
import { useDropzone } from "react-dropzone";
import {
    FileText, UploadCloud, ChevronDown, ChevronUp, Check, X, Edit3, Camera,
    Sparkles, ArrowRight, TrendingUp,
} from "lucide-react";
import { ReceiptsSkeleton } from "@/components/Skeleton";

/* ─── Elapsed-time hook for long-running operations ─── */
function useElapsedSeconds(running: boolean) {
    const [elapsed, setElapsed] = useState(0);
    const ref = useRef<ReturnType<typeof setInterval>>(undefined);
    useEffect(() => {
        if (running) {
            setElapsed(0);
            ref.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        } else {
            clearInterval(ref.current);
        }
        return () => clearInterval(ref.current);
    }, [running]);
    return elapsed;
}

/* ─── Friendly progress message based on elapsed time ─── */
function progressMessage(seconds: number): string {
    if (seconds < 3) return "Uploading file…";
    if (seconds < 10) return "Running OCR text extraction…";
    if (seconds < 25) return "AI is structuring the receipt…";
    return "Still working — large documents take longer…";
}

export default function ReceiptsPage() {
    const qc = useQueryClient();
    const [pendingReceipt, setPendingReceipt] = useState<any>(null);
    const [postConfirmNudge, setPostConfirmNudge] = useState<{
        itemCount: number; total: string; budgetSpent?: string; budgetLimit?: string;
        onTrack?: boolean; insight?: string;
    } | null>(null);

    const { data: receipts = [], isLoading } = useQuery({
        queryKey: ["receipts"],
        queryFn: () => receiptApi.list().then((r) => r.data),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => receiptApi.upload(file).then((r) => r.data),
        onSuccess: (data) => setPendingReceipt(data),
    });

    const elapsed = useElapsedSeconds(uploadMutation.isPending);

    const confirmMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) =>
            receiptApi.confirm(id, payload).then((r) => r.data),
        onSuccess: async (_data, variables) => {
            const itemCount = variables.payload.items?.length || 0;
            const total = variables.payload.total_amount || "0";
            setPendingReceipt(null);
            qc.invalidateQueries({ queryKey: ["receipts"] });
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["budget"] });

            // Fetch budget context + insight for the nudge card
            const now = new Date();
            const nudge: typeof postConfirmNudge = { itemCount, total: String(total) };
            try {
                const [budgetRes, insightRes] = await Promise.all([
                    budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
                    insightsApi.list().then((r) => r.data),
                ]);
                nudge.budgetSpent = budgetRes.total_spent;
                nudge.budgetLimit = budgetRes.budget_limit;
                nudge.onTrack = budgetRes.on_track;
                const receiptInsight = insightRes.find((i: any) =>
                    i.screen === "budget" || i.type === "budget_pace" || i.type === "category_change"
                );
                if (receiptInsight) nudge.insight = receiptInsight.body;
            } catch { /* budget/insight fetch is best-effort */ }
            setPostConfirmNudge(nudge);
        },
    });

    const onDrop = useCallback(
        (files: File[]) => {
            if (files[0]) uploadMutation.mutate(files[0]);
        },
        [uploadMutation]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpg", ".jpeg", ".png", ".webp"],
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
                <p className="text-sm text-neutral">
                    {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* ─── Upload Zone ─── */}
            {!pendingReceipt && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary"
                        }`}
                >
                    <input {...getInputProps()} />
                    {uploadMutation.isPending ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-700 font-medium">
                                {progressMessage(elapsed)}
                            </p>
                            <p className="text-sm text-neutral">
                                {elapsed}s elapsed — this typically takes 15–30 seconds
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <Camera className="w-8 h-8 text-neutral" />
                                <UploadCloud className="w-8 h-8 text-neutral" />
                            </div>
                            <p className="text-gray-700 font-medium">
                                {isDragActive
                                    ? "Drop it here!"
                                    : "Drag & drop a receipt or click to upload"}
                            </p>
                            <p className="text-sm text-neutral mt-1">
                                JPG, PNG, PDF · AI-powered extraction
                            </p>
                        </>
                    )}
                </div>
            )}

            {uploadMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    <p className="font-medium">Upload failed</p>
                    <p className="mt-1">
                        {(uploadMutation.error as any)?.response?.data?.detail
                            || (uploadMutation.error as any)?.message
                            || "Please try again with a clearer image."}
                    </p>
                </div>
            )}

            {/* ─── Review & Confirm Pending Receipt ─── */}
            {pendingReceipt && (
                <ReviewPanel
                    receipt={pendingReceipt}
                    onConfirm={(payload) =>
                        confirmMutation.mutate({
                            id: pendingReceipt.id,
                            payload,
                        })
                    }
                    onCancel={() => setPendingReceipt(null)}
                    isConfirming={confirmMutation.isPending}
                />
            )}

            {confirmMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    Failed to save — {(confirmMutation.error as any)?.response?.data?.detail || "please try again."}
                </div>
            )}

            {/* ─── Post-Confirm Nudge Card ─── */}
            {postConfirmNudge && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 space-y-3 animate-in slide-in-from-bottom-2">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <Check size={16} className="text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-800">
                                    ${parseFloat(postConfirmNudge.total).toFixed(2)} added to your pantry
                                </p>
                                <p className="text-sm text-green-600">
                                    {postConfirmNudge.itemCount} item{postConfirmNudge.itemCount !== 1 ? "s" : ""} saved with expiry tracking
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setPostConfirmNudge(null)} className="text-green-400 hover:text-green-600">
                            <X size={16} />
                        </button>
                    </div>
                    {postConfirmNudge.budgetSpent && postConfirmNudge.budgetLimit && (
                        <div className="flex items-center gap-3 bg-white/60 rounded-lg px-4 py-3">
                            <TrendingUp size={16} className={postConfirmNudge.onTrack ? "text-green-600" : "text-orange-500"} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                    Groceries this month: ${parseFloat(postConfirmNudge.budgetSpent).toFixed(2)}
                                    <span className="text-gray-500"> / ${parseFloat(postConfirmNudge.budgetLimit).toFixed(2)}</span>
                                </p>
                                <p className={`text-xs ${postConfirmNudge.onTrack ? "text-green-600" : "text-orange-600"}`}>
                                    {postConfirmNudge.onTrack ? "You're on pace — good." : "Spending is above pace this month."}
                                </p>
                            </div>
                        </div>
                    )}
                    {postConfirmNudge.insight && (
                        <div className="flex items-start gap-2 bg-white/60 rounded-lg px-4 py-3">
                            <Sparkles size={14} className="text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{postConfirmNudge.insight}</p>
                        </div>
                    )}
                    <a href="/dashboard/pantry" className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                        View pantry <ArrowRight size={14} />
                    </a>
                </div>
            )}

            {/* ─── Receipt History ─── */}
            {isLoading ? (
                <ReceiptsSkeleton />
            ) : receipts.length === 0 && !pendingReceipt ? (
                <div className="text-center py-16 text-neutral">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No receipts scanned yet.</p>
                    <p className="text-sm mt-1">
                        Upload a receipt image above to get started.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {receipts.map((receipt: any) => (
                        <ReceiptCard key={receipt.id} receipt={receipt} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Review Panel: edit items before confirming ─── */
function ReviewPanel({
    receipt,
    onConfirm,
    onCancel,
    isConfirming,
}: {
    receipt: any;
    onConfirm: (payload: any) => void;
    onCancel: () => void;
    isConfirming: boolean;
}) {
    const [merchant, setMerchant] = useState(receipt.merchant_name || "");
    const [total, setTotal] = useState(receipt.total_amount || "0");
    const [purchaseDate, setPurchaseDate] = useState(receipt.purchase_date || "");
    const [items, setItems] = useState<any[]>(receipt.items || []);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    const updateItem = (idx: number, field: string, value: any) => {
        setItems((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
        );
    };

    const removeItem = (idx: number) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { name: "", price: 0, quantity: 1, category: "Other", unit: null },
        ]);
        setEditingIdx(items.length);
    };

    const handleConfirm = () => {
        onConfirm({
            merchant_name: merchant,
            total_amount: parseFloat(total) || 0,
            purchase_date: purchaseDate || null,
            items: items.filter((i) => i.name.trim()),
        });
    };

    return (
        <div className="bg-white border-2 border-primary/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Edit3 size={18} className="text-primary" />
                    Review & Confirm
                </h2>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    AI-parsed
                </span>
            </div>

            {/* Merchant / Date / Total */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label htmlFor="receipt-store" className="text-xs font-medium text-gray-500 mb-1 block">
                        Store
                    </label>
                    <input
                        id="receipt-store"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder="Store name"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <div>
                    <label htmlFor="receipt-date" className="text-xs font-medium text-gray-500 mb-1 block">
                        Date
                    </label>
                    <input
                        id="receipt-date"
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        title="Purchase date"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <div>
                    <label htmlFor="receipt-total" className="text-xs font-medium text-gray-500 mb-1 block">
                        Total
                    </label>
                    <input
                        id="receipt-total"
                        type="number"
                        step="0.01"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            </div>

            {/* Items list */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                        Items ({items.length})
                    </p>
                    <button
                        onClick={addItem}
                        className="text-xs text-primary font-medium hover:underline"
                    >
                        + Add item
                    </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5"
                        >
                            {editingIdx === idx ? (
                                <>
                                    <input
                                        value={item.name}
                                        onChange={(e) =>
                                            updateItem(idx, "name", e.target.value)
                                        }
                                        placeholder="Item name"
                                        aria-label="Item name"
                                        className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) =>
                                            updateItem(
                                                idx,
                                                "price",
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                        aria-label="Item price"
                                        className="w-20 border border-gray-200 rounded px-2 py-1 text-sm"
                                    />
                                    <select
                                        value={item.category || "Other"}
                                        onChange={(e) =>
                                            updateItem(idx, "category", e.target.value)
                                        }
                                        aria-label="Item category"
                                        className="w-28 border border-gray-200 rounded px-2 py-1 text-xs"
                                    >
                                        {[
                                            "Dairy", "Bakery", "Produce", "Meat",
                                            "Seafood", "Beverages", "Snacks",
                                            "Household", "Personal Care",
                                            "Pantry Staples", "Frozen", "Deli", "Other",
                                        ].map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setEditingIdx(null)}
                                        className="text-primary"
                                        aria-label="Save item"
                                    >
                                        <Check size={14} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-sm text-gray-700 truncate">
                                        {item.name || "Unnamed"}
                                    </span>
                                    <span className="text-xs text-neutral bg-gray-200 rounded px-1.5 py-0.5">
                                        {item.category || "Other"}
                                    </span>
                                    <span className="text-sm font-medium text-gray-800 w-16 text-right">
                                        ${parseFloat(item.price || 0).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => setEditingIdx(idx)}
                                        className="text-neutral hover:text-primary"
                                        aria-label="Edit item"
                                    >
                                        <Edit3 size={13} />
                                    </button>
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="text-neutral hover:text-red-500"
                                        aria-label="Remove item"
                                    >
                                        <X size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                    Discard
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isConfirming || items.length === 0}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    <Check size={14} />
                    {isConfirming
                        ? "Saving…"
                        : `Confirm & Add ${items.length} Item${items.length !== 1 ? "s" : ""} to Pantry`}
                </button>
            </div>
        </div>
    );
}

/* ─── Receipt History Card ─── */
function ReceiptCard({ receipt }: { receipt: any }) {
    const [expanded, setExpanded] = useState(false);
    const items = receipt.items ?? [];

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
            >
                <div>
                    <p className="font-medium text-gray-800">
                        {receipt.merchant_name || "Unknown Store"}
                    </p>
                    <p className="text-xs text-neutral mt-0.5">
                        {receipt.purchase_date
                            ? new Date(receipt.purchase_date).toLocaleDateString(
                                "en-US",
                                {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            )
                            : "No date"}
                        {" · "}
                        {receipt.processing_status === "DONE" ? (
                            <span className="text-green-600">Processed</span>
                        ) : receipt.processing_status === "FAILED" ? (
                            <span className="text-red-500">Failed</span>
                        ) : (
                            <span className="text-yellow-600">Processing</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {receipt.is_reconciled && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            Matched
                        </span>
                    )}
                    <span className="text-base font-semibold text-gray-900">
                        ${parseFloat(receipt.total_amount || "0").toFixed(2)}
                    </span>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-neutral" />
                    )}
                </div>
            </button>

            {expanded && items.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-3 space-y-1.5">
                    {items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-700">
                                    {item.name}
                                    {item.quantity && item.quantity > 1
                                        ? ` ×${item.quantity}`
                                        : ""}
                                </span>
                                {item.category && (
                                    <span className="text-xs text-neutral bg-gray-100 px-1.5 py-0.5 rounded">
                                        {item.category}
                                    </span>
                                )}
                            </div>
                            <span className="text-neutral">
                                ${parseFloat(item.price || "0").toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {expanded && items.length === 0 && (
                <div className="border-t border-gray-100 px-5 py-3 text-sm text-neutral">
                    No line items recorded for this receipt.
                </div>
            )}
        </div>
    );
}
