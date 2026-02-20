"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi, receiptApi } from "@/lib/api";
import { format } from "date-fns";
import { Upload, Plus, CheckCircle2, Trash2, Package } from "lucide-react";

type Status = "UNOPENED" | "OPENED" | "CONSUMED" | "TRASHED";
type Location = "ALL" | "FRIDGE" | "FREEZER" | "PANTRY";

const LOCATIONS: Location[] = ["ALL", "FRIDGE", "FREEZER", "PANTRY"];
const STATUS_COLORS: Record<Status, string> = {
    UNOPENED: "bg-secondary/10 text-secondary-dark",
    OPENED: "bg-blue-50 text-blue-700",
    CONSUMED: "bg-gray-100 text-gray-500",
    TRASHED: "bg-red-50 text-red-500",
};

export default function PantryPage() {
    const qc = useQueryClient();
    const [location, setLocation] = useState<Location>("ALL");
    const [uploading, setUploading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["pantry", location],
        queryFn: () =>
            pantryApi
                .list(location === "ALL" ? {} : { location })
                .then((r) => r.data),
    });

    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) =>
            pantryApi.updateItem(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { data } = await receiptApi.upload(file);
            setScanResult(data);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!scanResult) return;
        await receiptApi.confirm(scanResult.id, {
            merchant_name: scanResult.merchant_name,
            total_amount: scanResult.total_amount,
            purchase_date: scanResult.purchase_date,
            items: scanResult.items,
        });
        setScanResult(null);
        qc.invalidateQueries({ queryKey: ["pantry"] });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Pantry</h1>
                <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-dark transition text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Scanning…" : "Scan Receipt"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>

            {/* Scan Review Modal */}
            {scanResult && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-lg font-bold mb-1">Review Scanned Receipt</h2>
                        <p className="text-sm text-neutral mb-4">{scanResult.merchant_name} · {scanResult.purchase_date}</p>
                        <div className="space-y-2 mb-6">
                            {(scanResult.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm border-b pb-1">
                                    <span>{item.name}</span>
                                    <span className="text-neutral">${parseFloat(item.price).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setScanResult(null)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                            <button onClick={handleConfirm} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark">
                                Add to Pantry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Filter */}
            <div className="flex gap-2 mb-6">
                {LOCATIONS.map((loc) => (
                    <button
                        key={loc}
                        onClick={() => setLocation(loc)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${location === loc ? "bg-primary text-white border-primary" : "border-gray-300 text-neutral hover:bg-gray-50"}`}
                    >
                        {loc.charAt(0) + loc.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            {isLoading ? (
                <div className="text-center py-16 text-neutral">Loading…</div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-neutral">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No items in {location === "ALL" ? "your pantry" : location.toLowerCase()} yet.</p>
                    <p className="text-sm mt-1">Scan a receipt to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map((item: any) => (
                        <PantryCard key={item.id} item={item} onUpdate={(data) => updateItem.mutate({ id: item.id, data })} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PantryCard({ item, onUpdate }: { item: any; onUpdate: (data: object) => void }) {
    const daysLeft = item.expiration_date
        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
        : null;

    const urgent = daysLeft !== null && daysLeft <= 3;

    return (
        <div className={`bg-white rounded-xl border p-4 ${urgent ? "border-alert" : "border-gray-200"}`}>
            <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status as Status]}`}>
                    {item.status.toLowerCase()}
                </span>
            </div>

            {item.category && <p className="text-xs text-neutral mb-2">{item.category} · {item.location}</p>}

            {item.expiration_date && (
                <p className={`text-xs mb-3 ${urgent ? "text-alert font-semibold" : "text-neutral"}`}>
                    Expires {format(new Date(item.expiration_date), "MMM d")}
                    {daysLeft !== null && daysLeft <= 7 && ` (${daysLeft}d)`}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => onUpdate({ status: "CONSUMED" })}
                    title="Mark consumed"
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-secondary text-secondary rounded-lg py-1.5 hover:bg-secondary/10 transition"
                >
                    <CheckCircle2 className="w-3 h-3" /> Used
                </button>
                <button
                    onClick={() => onUpdate({ status: "TRASHED" })}
                    title="Throw away"
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-alert/50 text-alert rounded-lg py-1.5 hover:bg-alert/10 transition"
                >
                    <Trash2 className="w-3 h-3" /> Trash
                </button>
            </div>
        </div>
    );
}
