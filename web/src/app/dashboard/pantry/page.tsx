"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi, receiptApi } from "@/lib/api";
import { format } from "date-fns";
import { Upload, Plus, CheckCircle2, Trash2, Package, Pencil, X, ShoppingCart } from "lucide-react";

type Status = "UNOPENED" | "OPENED" | "CONSUMED" | "TRASHED";
type Location = "ALL" | "FRIDGE" | "FREEZER" | "PANTRY";

const LOCATIONS: Location[] = ["ALL", "FRIDGE", "FREEZER", "PANTRY"];
const STATUS_COLORS: Record<Status, string> = {
    UNOPENED: "bg-secondary/10 text-secondary-dark",
    OPENED: "bg-blue-50 text-blue-700",
    CONSUMED: "bg-gray-100 text-gray-500",
    TRASHED: "bg-red-50 text-red-500",
};

const EMPTY_FORM = {
    name: "",
    brand: "",
    category: "",
    location: "PANTRY",
    quantity: "1",
    unit: "",
    purchase_price: "",
    expiration_date: "",
};

export default function PantryPage() {
    const qc = useQueryClient();
    const [location, setLocation] = useState<Location>("ALL");
    const [uploading, setUploading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
    const [editingItem, setEditingItem] = useState<any>(null);

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
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pantry"] });
            setEditingItem(null);
        },
    });

    const addItem = useMutation({
        mutationFn: (data: object) => pantryApi.addItem(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pantry"] });
            setShowAddForm(false);
            setAddForm({ ...EMPTY_FORM });
        },
    });

    const deleteItem = useMutation({
        mutationFn: (id: string) => pantryApi.deleteItem(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addItem.mutate({
            name: addForm.name,
            brand: addForm.brand || null,
            category: addForm.category || null,
            location: addForm.location,
            quantity: parseFloat(addForm.quantity) || 1,
            unit: addForm.unit || null,
            purchase_price: addForm.purchase_price ? parseFloat(addForm.purchase_price) : null,
            expiration_date: addForm.expiration_date || null,
        });
    };

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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                    <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-dark transition text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        {uploading ? "Scanning…" : "Scan Receipt"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            {/* Manual Add Item Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold">Add Item Manually</h2>
                        <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Name *</label>
                            <input
                                required
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                placeholder="e.g. Milk"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Brand</label>
                            <input
                                value={addForm.brand}
                                onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                                placeholder="e.g. Organic Valley"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Category</label>
                            <input
                                value={addForm.category}
                                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                                placeholder="e.g. Dairy"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Location</label>
                            <select
                                value={addForm.location}
                                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="PANTRY">Pantry</option>
                                <option value="FRIDGE">Fridge</option>
                                <option value="FREEZER">Freezer</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-sm text-gray-700 mb-1">Qty</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={addForm.quantity}
                                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-gray-700 mb-1">Unit</label>
                                <input
                                    value={addForm.unit}
                                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                                    placeholder="lbs, oz…"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Price $</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={addForm.purchase_price}
                                onChange={(e) => setAddForm({ ...addForm, purchase_price: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Expiration Date</label>
                            <input
                                type="date"
                                value={addForm.expiration_date}
                                onChange={(e) => setAddForm({ ...addForm, expiration_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                            <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={addItem.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                                {addItem.isPending ? "Adding…" : "Add to Pantry"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <EditItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={(data) => updateItem.mutate({ id: editingItem.id, data })}
                    isPending={updateItem.isPending}
                />
            )}

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
                    <p className="text-sm mt-1">Scan a receipt or add items manually.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map((item: any) => (
                        <PantryCard
                            key={item.id}
                            item={item}
                            onUpdate={(data) => updateItem.mutate({ id: item.id, data })}
                            onEdit={() => setEditingItem(item)}
                            onDelete={() => { if (confirm("Delete this item?")) deleteItem.mutate(item.id); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Edit Item Modal ──────────────────────────────────────── */
function EditItemModal({ item, onClose, onSave, isPending }: {
    item: any; onClose: () => void; onSave: (data: object) => void; isPending: boolean;
}) {
    const [form, setForm] = useState({
        name: item.name || "",
        category: item.category || "",
        location: item.location || "PANTRY",
        quantity: String(item.quantity ?? "1"),
        status: item.status || "UNOPENED",
        expiration_date: item.expiration_date?.slice(0, 10) || "",
        on_shopping_list: item.on_shopping_list ?? false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name: form.name,
            category: form.category || null,
            location: form.location,
            quantity: parseFloat(form.quantity) || 1,
            status: form.status,
            expiration_date: form.expiration_date || null,
            on_shopping_list: form.on_shopping_list,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Edit Item</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Name</label>
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Category</label>
                            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Location</label>
                            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                <option value="PANTRY">Pantry</option>
                                <option value="FRIDGE">Fridge</option>
                                <option value="FREEZER">Freezer</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                            <input type="number" min="0" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Status</label>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                <option value="UNOPENED">Unopened</option>
                                <option value="OPENED">Opened</option>
                                <option value="CONSUMED">Consumed</option>
                                <option value="TRASHED">Trashed</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Expiration Date</label>
                        <input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit_shopping" checked={form.on_shopping_list} onChange={(e) => setForm({ ...form, on_shopping_list: e.target.checked })} className="accent-primary" />
                        <label htmlFor="edit_shopping" className="text-sm text-gray-700">On shopping list</label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                            {isPending ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Pantry Card ──────────────────────────────────────────── */
function PantryCard({ item, onUpdate, onEdit, onDelete }: {
    item: any; onUpdate: (data: object) => void; onEdit: () => void; onDelete: () => void;
}) {
    const daysLeft = item.expiration_date
        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
        : null;

    const urgent = daysLeft !== null && daysLeft <= 3;

    return (
        <div className={`bg-white rounded-xl border p-4 ${urgent ? "border-alert" : "border-gray-200"}`}>
            <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status as Status]}`}>
                        {item.status.toLowerCase()}
                    </span>
                </div>
            </div>

            {item.category && <p className="text-xs text-neutral mb-1">{item.category} · {item.location}</p>}
            {item.quantity && <p className="text-xs text-neutral mb-1">Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ""}</p>}

            {item.expiration_date && (
                <p className={`text-xs mb-3 ${urgent ? "text-alert font-semibold" : "text-neutral"}`}>
                    Expires {format(new Date(item.expiration_date), "MMM d")}
                    {daysLeft !== null && daysLeft <= 7 && ` (${daysLeft}d)`}
                </p>
            )}

            {item.on_shopping_list && (
                <p className="text-xs text-blue-600 mb-2 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> On shopping list</p>
            )}

            <div className="flex gap-1.5">
                <button
                    onClick={() => onUpdate({ status: "CONSUMED" })}
                    title="Mark consumed"
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-secondary text-secondary rounded-lg py-1.5 hover:bg-secondary/10 transition"
                >
                    <CheckCircle2 className="w-3 h-3" /> Used
                </button>
                <button
                    onClick={onEdit}
                    title="Edit item"
                    className="flex items-center justify-center text-xs border border-gray-300 text-neutral rounded-lg px-2 py-1.5 hover:bg-gray-50 transition"
                >
                    <Pencil className="w-3 h-3" />
                </button>
                <button
                    onClick={onDelete}
                    title="Delete item"
                    className="flex items-center justify-center text-xs border border-alert/50 text-alert rounded-lg px-2 py-1.5 hover:bg-alert/10 transition"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
