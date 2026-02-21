"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pantryApi } from "@/lib/api";
import { ShoppingCart, CheckCircle2, Trash2 } from "lucide-react";

export default function ShoppingPage() {
    const qc = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["shopping-list"],
        queryFn: () => pantryApi.shoppingList().then((r) => r.data),
    });

    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: string; data: object }) =>
            pantryApi.updateItem(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["shopping-list"] });
            qc.invalidateQueries({ queryKey: ["pantry"] });
        },
    });

    const removeFromList = (id: string) =>
        updateItem.mutate({ id, data: { on_shopping_list: false } });

    const markPurchased = (id: string) =>
        updateItem.mutate({ id, data: { on_shopping_list: false, status: "UNOPENED" } });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
                <p className="text-sm text-neutral">{items.length} item{items.length !== 1 ? "s" : ""}</p>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-neutral">Loading…</div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-neutral">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Your shopping list is empty.</p>
                    <p className="text-sm mt-1">Items are automatically added when you consume or trash pantry items.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                            <div>
                                <p className="font-medium text-gray-800">{item.name}</p>
                                <p className="text-xs text-neutral">
                                    {item.category && `${item.category} · `}
                                    {item.location?.charAt(0) + item.location?.slice(1).toLowerCase()}
                                    {item.quantity && item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => markPurchased(item.id)}
                                    title="Purchased"
                                    className="flex items-center gap-1 text-xs border border-secondary text-secondary rounded-lg px-3 py-1.5 hover:bg-secondary/10 transition"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Bought
                                </button>
                                <button
                                    onClick={() => removeFromList(item.id)}
                                    title="Remove from list"
                                    className="flex items-center gap-1 text-xs border border-gray-300 text-neutral rounded-lg px-2 py-1.5 hover:bg-gray-50 transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
