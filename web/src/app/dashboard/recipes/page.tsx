"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, CheckCircle2, XCircle, ChefHat, Search, RefreshCw } from "lucide-react";

interface Recipe {
    name: string;
    time_minutes: number | null;
    ingredients: string[];
    instructions: string;
    image_url: string | null;
    matched_count: number;
    missing: string[];
    match_score: number;
    source: string;
}

export default function RecipesPage() {
    const [expiringFirst, setExpiringFirst] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Recipe[] | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["recipe-suggestions", expiringFirst],
        queryFn: () =>
            api.get(`/recipes/suggestions?limit=8&expiring_first=${expiringFirst}`).then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQ.trim()) return;
        setSearching(true);
        try {
            const res = await api.get(`/recipes/search?q=${encodeURIComponent(searchQ)}&limit=8`);
            setSearchResults(res.data.results);
        } finally {
            setSearching(false);
        }
    };

    const recipes: Recipe[] = searchResults ?? data?.suggestions ?? [];
    const pantryCount: number = data?.pantry_item_count ?? 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recipe Suggestions</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {pantryCount > 0
                            ? `Based on ${pantryCount} items in your pantry`
                            : "Add items to your pantry to get personalized suggestions"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={expiringFirst}
                            onChange={(e) => {
                                setExpiringFirst(e.target.checked);
                                setSearchResults(null);
                            }}
                            className="rounded border-gray-300 text-primary"
                        />
                        Prioritize expiring items
                    </label>
                    <button
                        onClick={() => { setSearchResults(null); refetch(); }}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by ingredient or recipe name…"
                        value={searchQ}
                        onChange={(e) => {
                            setSearchQ(e.target.value);
                            if (!e.target.value) setSearchResults(null);
                        }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {searching ? "…" : "Search"}
                </button>
            </form>

            {/* Loading state */}
            {isLoading && !searchResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {/* No results */}
            {!isLoading && recipes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <ChefHat size={48} className="mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No recipes found</p>
                    <p className="text-sm mt-1">
                        {searchResults !== null
                            ? "Try a different search term"
                            : "Add more items to your pantry to unlock suggestions"}
                    </p>
                </div>
            )}

            {/* Recipe cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map((recipe) => {
                    const isExpanded = expanded === recipe.name;
                    const scoreColor =
                        recipe.match_score >= 80
                            ? "text-secondary"
                            : recipe.match_score >= 50
                                ? "text-yellow-600"
                                : "text-gray-400";

                    return (
                        <div
                            key={recipe.name}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Card header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-gray-900 leading-tight">{recipe.name}</h3>
                                    <span className={`text-sm font-bold shrink-0 ${scoreColor}`}>
                                        {recipe.match_score}%
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    {recipe.time_minutes && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={13} />
                                            {recipe.time_minutes} min
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-secondary">
                                        <CheckCircle2 size={13} />
                                        {recipe.matched_count} of {recipe.ingredients.length} in pantry
                                    </span>
                                </div>

                                {/* Missing ingredients badge */}
                                {recipe.missing.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {recipe.missing.map((m) => (
                                            <span
                                                key={m}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-alert/10 text-alert text-xs rounded-full"
                                            >
                                                <XCircle size={10} />
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Expand button */}
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : recipe.name)}
                                    className="mt-3 text-sm text-primary hover:underline"
                                >
                                    {isExpanded ? "Hide instructions" : "Show instructions"}
                                </button>
                            </div>

                            {/* Expanded instructions */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {recipe.instructions.startsWith("http") ? (
                                            <a
                                                href={recipe.instructions}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                View full recipe →
                                            </a>
                                        ) : (
                                            recipe.instructions
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
