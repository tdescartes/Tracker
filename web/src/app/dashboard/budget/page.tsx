"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { budgetApi } from "@/lib/api";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const CATEGORY_COLORS = [
    "#006994", "#87A96B", "#EC5800", "#708090", "#f59e0b", "#6366f1", "#ec4899", "#10b981",
];

export default function BudgetPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [limit, setLimit] = useState(600);
    const [inflationItem, setInflationItem] = useState("milk");
    const [searchedItem, setSearchedItem] = useState<string | null>(null);

    const { data: summary } = useQuery({
        queryKey: ["budget", year, month, limit],
        queryFn: () => budgetApi.summary(year, month, limit).then((r) => r.data),
    });

    const { data: inflationData } = useQuery({
        queryKey: ["inflation", searchedItem],
        queryFn: () => budgetApi.inflation(searchedItem!).then((r) => r.data),
        enabled: !!searchedItem,
    });

    const pieData = Object.entries(summary?.by_category ?? {}).map(([name, value]) => ({
        name,
        value: parseFloat(value as string),
    }));

    const spent = parseFloat(summary?.total_spent ?? "0");
    const budgetLimit = limit;
    const pct = Math.min((spent / budgetLimit) * 100, 100);

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Budget</h1>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral">Month:</label>
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(2026, i, 1).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral">Monthly limit: $</label>
                    <input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Meter */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-base font-semibold mb-4">Spending vs Budget</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Spent: <strong>${spent.toFixed(2)}</strong></span>
                            <span>Limit: <strong>${budgetLimit.toFixed(2)}</strong></span>
                        </div>
                        <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${pct > 90 ? "bg-alert" : pct > 70 ? "bg-yellow-400" : "bg-secondary"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-neutral">{pct.toFixed(0)}% used</span>
                            <span className={summary?.remaining && parseFloat(summary.remaining) < 0 ? "text-alert font-semibold" : "text-secondary"}>
                                ${Math.abs(parseFloat(summary?.remaining ?? "0")).toFixed(2)} {parseFloat(summary?.remaining ?? "0") < 0 ? "over budget" : "remaining"}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                        <span className="text-neutral">Food waste this month:</span>
                        <span className="text-alert font-medium">${parseFloat(summary?.waste_cost ?? "0").toFixed(2)}</span>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-base font-semibold mb-4">Spending by Category</h2>
                    {pieData.length === 0 ? (
                        <p className="text-neutral text-sm text-center py-8">No data for this period.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {pieData.map((_, index) => (
                                        <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Inflation Tracker */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                    <h2 className="text-base font-semibold mb-4">Inflation Tracker — Price History</h2>
                    <div className="flex gap-3 mb-4">
                        <input
                            value={inflationItem}
                            onChange={(e) => setInflationItem(e.target.value)}
                            placeholder="e.g. milk, eggs, bread"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1"
                        />
                        <button
                            onClick={() => setSearchedItem(inflationItem)}
                            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-dark transition"
                        >
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
                        <p className="text-neutral text-sm text-center py-6">No price history found for "{searchedItem}".</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
