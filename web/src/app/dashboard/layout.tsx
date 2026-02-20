"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useHouseholdSync } from "@/hooks/useHouseholdSync";
import {
    LayoutDashboard, Package, Wallet, Target, FileText, LogOut, Home,
    ChefHat, Bell, CheckCheck, X,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/pantry", label: "Pantry", icon: Package },
    { href: "/dashboard/budget", label: "Budget", icon: Wallet },
    { href: "/dashboard/goals", label: "Goals", icon: Target },
    { href: "/dashboard/recipes", label: "Recipes", icon: ChefHat },
    { href: "/dashboard/bank", label: "Bank", icon: FileText },
];

function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const qc = useQueryClient();

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => api.get("/notifications/").then((r) => r.data),
        refetchInterval: 60_000, // poll every minute
    });

    const markAll = useMutation({
        mutationFn: () => api.post("/notifications/read-all"),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const unread: number = data?.unread_count ?? 0;
    const notifications: any[] = data?.notifications ?? [];
    const typeIcon = (type: string) =>
        type === "alert" ? "🔴" : type === "warning" ? "🟡" : type === "success" ? "🟢" : "🔵";

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-alert text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-800">Notifications</span>
                        <div className="flex items-center gap-2">
                            {unread > 0 && (
                                <button
                                    onClick={() => markAll.mutate()}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <CheckCheck size={12} /> Mark all read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8">You're all caught up!</p>
                        ) : (
                            notifications.slice(0, 20).map((n: any) => (
                                <div
                                    key={n.id}
                                    className={clsx(
                                        "px-4 py-3 text-sm",
                                        !n.is_read && "bg-primary/5"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                                        <div>
                                            <p className="font-medium text-gray-800">{n.title}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, hydrate, logout } = useAuthStore();

    // Phase 3: Real-time household sync via WebSocket
    useHouseholdSync((user as any)?.household_id ?? null);

    useEffect(() => {
        hydrate().then(() => {
            const token = localStorage.getItem("hb_token");
            if (!token) router.push("/login");
        });
    }, [hydrate, router]);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Sidebar */}
            <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                {/* Brand */}
                <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
                    <Home className="w-6 h-6 text-primary" />
                    <span className="text-xl font-bold text-primary">Tracker</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                                pathname === href
                                    ? "bg-primary text-white"
                                    : "text-neutral hover:bg-gray-100 hover:text-gray-800"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-4 py-4 border-t border-gray-100">
                    <p className="text-xs text-neutral truncate mb-2">{user?.email}</p>
                    <button
                        onClick={() => { logout(); router.push("/login"); }}
                        className="flex items-center gap-2 text-sm text-neutral hover:text-alert transition"
                    >
                        <LogOut className="w-4 h-4" /> Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar with notification bell */}
                <header className="flex items-center justify-end px-8 py-3 border-b border-gray-200 bg-white shrink-0">
                    <NotificationBell />
                </header>
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

