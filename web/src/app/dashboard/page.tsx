"use client";

import { useQuery } from "@tanstack/react-query";
import { pantryApi, budgetApi } from "@/lib/api";
import { AlertTriangle, DollarSign, ShoppingCart, TrendingDown } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
    const now = new Date();
    const { data: expiring } = useQuery({
        queryKey: ["expiring"],
        queryFn: () => pantryApi.expiringSoon(3).then((r) => r.data),
    });
    const { data: budget } = useQuery({
        queryKey: ["budget", now.getFullYear(), now.getMonth() + 1],
        queryFn: () =>
            budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });

    const spent = parseFloat(budget?.total_spent ?? "0");
    const limit = parseFloat(budget?.budget_limit ?? "600");
    const pct = Math.min((spent / limit) * 100, 100);

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Good {getGreeting()}, welcome back 👋
            </h1>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<AlertTriangle className="text-alert" />}
                    label="Expiring Soon"
                    value={`${expiring?.length ?? 0} items`}
                    sub="within 3 days"
                    accent="alert"
                />
                <StatCard
                    icon={<DollarSign className="text-primary" />}
                    label="Spent This Month"
                    value={`$${spent.toFixed(2)}`}
                    sub={`of $${limit.toFixed(0)} budget`}
                    accent="primary"
                />
                <StatCard
                    icon={<TrendingDown className="text-secondary" />}
                    label="Food Waste"
                    value={`$${parseFloat(budget?.waste_cost ?? "0").toFixed(2)}`}
                    sub="thrown away this month"
                    accent="secondary"
                />
                <StatCard
                    icon={<ShoppingCart className="text-neutral" />}
                    label="Remaining Budget"
                    value={`$${Math.max(limit - spent, 0).toFixed(2)}`}
                    sub={`for ${daysLeftInMonth()} more days`}
                    accent="neutral"
                />
            </div>

            {/* Budget Meter */}
            <Section title="Monthly Grocery Budget">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Spent: <strong>${spent.toFixed(2)}</strong></span>
                        <span>Limit: <strong>${limit.toFixed(2)}</strong></span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${pct > 90 ? "bg-alert" : pct > 70 ? "bg-yellow-500" : "bg-secondary"}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-sm text-neutral">{pct.toFixed(0)}% used</p>
                </div>
            </Section>

            {/* Eat Me First */}
            <Section title="🍎 Eat Me First (Expiring Soon)">
                {!expiring || expiring.length === 0 ? (
                    <p className="text-neutral text-sm">No items expiring in the next 3 days. Great job!</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {expiring.map((item: any) => (
                            <ExpiryCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}

function StatCard({ icon, label, value, sub, accent }: {
    icon: React.ReactNode; label: string; value: string; sub: string; accent: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 flex items-center justify-center">{icon}</div>
                <span className="text-sm text-neutral">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-neutral mt-1">{sub}</p>
        </div>
    );
}

function ExpiryCard({ item }: { item: any }) {
    const daysLeft = item.expiration_date
        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / 86400000)
        : null;

    return (
        <div className={`rounded-lg border p-3 ${daysLeft !== null && daysLeft <= 1 ? "border-alert bg-orange-50" : "border-yellow-400 bg-yellow-50"}`}>
            <p className="font-medium text-gray-800">{item.name}</p>
            <p className="text-xs text-neutral mt-0.5">
                {item.expiration_date ? format(new Date(item.expiration_date), "MMM d") : "No date"} &middot; {item.location}
            </p>
            {daysLeft !== null && (
                <p className={`text-xs font-semibold mt-1 ${daysLeft <= 1 ? "text-alert" : "text-yellow-700"}`}>
                    {daysLeft <= 0 ? "Expired!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                </p>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
            {children}
        </div>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
}

function daysLeftInMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}
