"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, chatApi } from "@/lib/api";
import { useHouseholdSync } from "@/hooks/useHouseholdSync";
import {
    LayoutDashboard, Package, Wallet, Target, FileText, LogOut, Home,
    ChefHat, Bell, CheckCheck, X, ShoppingCart, Receipt, Settings,
    MessageCircle, Send, Sparkles,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/pantry", label: "Pantry", icon: Package },
    { href: "/dashboard/money", label: "Money", icon: Wallet },
    { href: "/dashboard/recipes", label: "Recipes", icon: ChefHat },
    { href: "/dashboard/receipts", label: "Receipts", icon: Receipt },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const qc = useQueryClient();

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => api.get("/api/notifications/").then((r) => r.data),
        refetchInterval: 60_000, // poll every minute
    });

    const markAll = useMutation({
        mutationFn: () => api.post("/api/notifications/read-all"),
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
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" title="Close notifications">
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
            const token = localStorage.getItem("tracker_token");
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

            {/* Floating AI chat button — visible on every dashboard page */}
            <FloatingChat />
        </div>
    );
}


/* ─── Floating AI Chat Button ─── */
function FloatingChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (directMsg?: string) => {
        const msg = (directMsg ?? input).trim();
        if (!msg || sending) return;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: msg }]);
        setSending(true);
        try {
            const { data } = await chatApi.send(msg);
            setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
        } catch {
            setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Please try again." }]);
        } finally {
            setSending(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition flex items-center justify-center z-50 group"
                title="Ask me anything about your spending, pantry, or goals"
            >
                <MessageCircle size={24} />
                <span className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Ask me anything
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} />
                    <span className="font-semibold text-sm">AI Assistant</span>
                </div>
                <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded p-1 transition" aria-label="Close chat">
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center text-neutral text-sm py-8">
                        <Sparkles size={24} className="mx-auto mb-2 text-primary/40" />
                        <p className="font-medium text-gray-700">Ask me anything</p>
                        <p className="text-xs mt-1 text-gray-400">
                            About your spending, pantry, or goals
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {["How much did I spend this month?", "What's expiring soon?", "Can I afford a vacation?"].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={clsx(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                            m.role === "user"
                                ? "bg-primary text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        )}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about spending, pantry, goals…"
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending}
                        className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition"
                        aria-label="Send message"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
}

