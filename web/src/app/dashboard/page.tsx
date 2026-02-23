"use client";

import { useQuery } from "@tanstack/react-query";
import { pantryApi, budgetApi, recipesApi, notificationsApi, insightsApi } from "@/lib/api";
import { AlertTriangle, DollarSign, ShoppingCart, TrendingDown, ChefHat, Bell, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function DashboardPage() {
    const now = new Date();
    const { data: expiring, isLoading: expiringLoading } = useQuery({
        queryKey: ["expiring"],
        queryFn: () => pantryApi.expiringSoon(3).then((r) => r.data),
    });
    const { data: budget, isLoading: budgetLoading } = useQuery({
        queryKey: ["budget", now.getFullYear(), now.getMonth() + 1],
        queryFn: () => budgetApi.summary(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
    });
    const { data: shopping } = useQuery({
        queryKey: ["shopping-list"],
        queryFn: () => pantryApi.shoppingList().then((r) => r.data),
    });
    const { data: recipeData } = useQuery({
        queryKey: ["recipe-suggestions-home"],
        queryFn: () => recipesApi.suggestions(true, 3).then((r) => r.data),
        staleTime: 5 * 60_000,
    });
    const { data: notifData } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => notificationsApi.list(true).then((r) => r.data),
    });

    const { data: insightsData, isLoading: insightsLoading } = useQuery({
        queryKey: ["insights"],
        queryFn: () => insightsApi.list().then((r) => r.data),
        staleTime: 60_000,
    });

    const isLoading = expiringLoading || budgetLoading || insightsLoading;

    const homeInsights = (insightsData ?? []).filter((i: any) => i.screen === "home" || i.screen === "budget").slice(0, 3);

    const confirmed = parseFloat(budget?.confirmed_spent ?? "0");
    const estimated = parseFloat(budget?.estimated_spent ?? "0");
    const spent = parseFloat(budget?.total_spent ?? "0");
    const limit = parseFloat(budget?.budget_limit ?? "600");
    const pct = Math.min((spent / limit) * 100, 100);
    const hasEstimated = estimated > 0;

    // Pace
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const dailyPace = parseFloat(budget?.daily_pace ?? "0");
    const onTrack = budget?.on_track ?? true;
    const daysLeft = daysInMonth - dayOfMonth;
    const dailyBudget = daysLeft > 0 ? (limit - spent) / daysLeft : 0;

    const recipes: any[] = recipeData?.suggestions ?? [];
    const topRecipe = recipes[0];
    const unreadNotifs: number = notifData?.unread_count ?? 0;
    const shoppingCount = shopping?.length ?? 0;
    const expiringCount = expiring?.length ?? 0;
    const actionCount = expiringCount + shoppingCount + unreadNotifs;

    if (isLoading) return <div><h1 className="text-2xl font-bold text-gray-900 mb-6">Good {getGreeting()}, welcome back 👋</h1><DashboardSkeleton /></div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Good {getGreeting()}, welcome back 👋
            </h1>

            {/* Action Needed Banner */}
            {actionCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚡</span>
                        <span className="font-semibold text-amber-800">Action Needed</span>
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">{actionCount}</span>
                    </div>
                    <div className="space-y-1 text-sm text-amber-900">
                        {expiringCount > 0 && <p>🍎 {expiringCount} item{expiringCount !== 1 ? "s" : ""} expiring soon</p>}
                        {shoppingCount > 0 && <p>🛒 {shoppingCount} item{shoppingCount !== 1 ? "s" : ""} on shopping list</p>}
                        {unreadNotifs > 0 && <p>🔔 {unreadNotifs} unread notification{unreadNotifs !== 1 ? "s" : ""}</p>}
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                {/* AI Insights */}
                {homeInsights.length > 0 && (
                    <div className="col-span-full mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {homeInsights.map((insight: any, i: number) => (
                                <div key={i} className={`rounded-xl border p-4 ${insight.type === "warning" ? "bg-red-50 border-red-200" :
                                    insight.type === "tip" ? "bg-blue-50 border-blue-200" :
                                        "bg-gray-50 border-gray-200"
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lightbulb size={14} className={
                                            insight.type === "warning" ? "text-alert" :
                                                insight.type === "tip" ? "text-primary" : "text-neutral"
                                        } />
                                        <span className="text-sm font-semibold text-gray-800">{insight.title}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{insight.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <StatCard
                    icon={<AlertTriangle className="text-alert" />}
                    label="Expiring Soon"
                    value={`${expiringCount} items`}
                    sub="within 3 days"
                />
                <StatCard
                    icon={<DollarSign className="text-primary" />}
                    label="Spent This Month"
                    value={`${hasEstimated ? "~" : ""}$${spent.toFixed(2)}`}
                    sub={`of $${limit.toFixed(0)} budget`}
                />
                <StatCard
                    icon={<TrendingDown className="text-secondary" />}
                    label="Food Waste"
                    value={`$${parseFloat(budget?.waste_cost ?? "0").toFixed(2)}`}
                    sub="thrown away this month"
                />
                <StatCard
                    icon={<ShoppingCart className="text-neutral" />}
                    label="Remaining Budget"
                    value={`$${Math.max(limit - spent, 0).toFixed(2)}`}
                    sub={`for ${daysLeft} more days`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Budget Pulse */}
                <Section title="Budget Pulse">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Total: <strong>{hasEstimated ? "~" : ""}${spent.toFixed(2)}</strong></span>
                            <span>Limit: <strong>${limit.toFixed(2)}</strong></span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                            <div
                                className={`h-full transition-all ${pct > 90 ? "bg-alert" : pct > 70 ? "bg-yellow-500" : "bg-secondary"}`}
                                style={{ width: `${Math.min((confirmed / limit) * 100, 100)}%` }}
                            />
                            {hasEstimated && (
                                <div className="h-full transition-all bg-secondary/40"
                                    style={{ width: `${Math.min((estimated / limit) * 100, pct - Math.min((confirmed / limit) * 100, 100))}%`, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)" }} />
                            )}
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral">{pct.toFixed(0)}% used</span>
                            <span className={!onTrack ? "text-alert font-semibold" : "text-neutral"}>
                                {onTrack ? "✓ On track" : "⚠ Over pace"} · ${dailyPace.toFixed(0)}/day
                            </span>
                        </div>
                        {hasEstimated && (
                            <div className="flex gap-3 text-xs text-neutral">
                                <span>Confirmed: ${confirmed.toFixed(0)}</span>
                                <span>Estimated: ~${estimated.toFixed(0)}</span>
                            </div>
                        )}
                        {dailyBudget > 0 && (
                            <p className="text-xs text-primary font-medium">${dailyBudget.toFixed(2)}/day remaining</p>
                        )}
                    </div>
                </Section>

                {/* Tonight's Pick */}
                {topRecipe ? (
                    <Link href="/dashboard/recipes" className="block">
                        <Section title="🍽 Tonight's Pick">
                            <p className="text-lg font-bold text-gray-900 mb-2">{topRecipe.name}</p>
                            <div className="flex gap-4 text-sm">
                                {topRecipe.time_minutes && <span className="text-neutral">⏱ {topRecipe.time_minutes} min</span>}
                                <span className="text-secondary font-medium">
                                    ✅ {topRecipe.matched_count}/{topRecipe.ingredients?.length ?? 0} in pantry
                                </span>
                                <span className="text-primary font-bold">{topRecipe.match_score}% match</span>
                            </div>
                            {topRecipe.missing?.length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-3">
                                    {topRecipe.missing.slice(0, 4).map((m: string) => (
                                        <span key={m} className="text-xs bg-orange-50 border border-alert text-alert rounded-full px-2 py-0.5">✗ {m}</span>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </Link>
                ) : (
                    <Section title="🍽 Tonight's Pick">
                        <div className="flex items-center gap-3 text-neutral">
                            <ChefHat className="w-8 h-8 opacity-30" />
                            <p className="text-sm">Add items to your pantry to get recipe suggestions!</p>
                        </div>
                    </Section>
                )}
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">📊 This Week</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-gray-900">{expiringCount}</p><p className="text-xs text-neutral mt-1">Expiring</p></div>
                    <div><p className="text-2xl font-bold text-gray-900">{shoppingCount}</p><p className="text-xs text-neutral mt-1">To Buy</p></div>
                    <div><p className="text-2xl font-bold text-gray-900">${parseFloat(budget?.waste_cost ?? "0").toFixed(0)}</p><p className="text-xs text-neutral mt-1">Wasted</p></div>
                    <div><p className="text-2xl font-bold text-gray-900">{recipes.length}</p><p className="text-xs text-neutral mt-1">Recipes</p></div>
                </div>
            </div>

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

function StatCard({ icon, label, value, sub }: {
    icon: React.ReactNode; label: string; value: string; sub: string;
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
