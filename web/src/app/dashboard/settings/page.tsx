"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
    User, Users, Shield, Download, Copy, Check, Plus, RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
            <div className="space-y-6">
                <ProfileSection />
                <PasswordSection />
                <HouseholdSection />
                <InviteSection />
                <MembersSection />
                <ExportSection />
            </div>
        </div>
    );
}

/* ── Profile ──────────────────────────────────────────────── */
function ProfileSection() {
    const qc = useQueryClient();
    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => settingsApi.getProfile().then((r) => r.data),
    });
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "");
            setEmail(profile.email || "");
        }
    }, [profile]);

    const update = useMutation({
        mutationFn: () => settingsApi.updateProfile({ full_name: name, email }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
    });

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Profile</h2>
            </div>
            {isLoading ? (
                <p className="text-sm text-neutral">Loading…</p>
            ) : (
                <form
                    onSubmit={(e) => { e.preventDefault(); update.mutate(); }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Full Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            disabled={update.isPending}
                            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                        >
                            {update.isPending ? "Saving…" : "Save Profile"}
                        </button>
                        {update.isSuccess && <span className="ml-3 text-sm text-secondary">Saved!</span>}
                    </div>
                </form>
            )}
        </section>
    );
}

/* ── Change Password ──────────────────────────────────────── */
function PasswordSection() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");

    const change = useMutation({
        mutationFn: () => settingsApi.changePassword({ current_password: current, new_password: next }),
        onSuccess: () => { setCurrent(""); setNext(""); setConfirm(""); setError(""); },
        onError: (e: any) => setError(e.response?.data?.detail || "Failed to change password"),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (next !== confirm) { setError("Passwords do not match"); return; }
        if (next.length < 6) { setError("Password must be at least 6 characters"); return; }
        setError("");
        change.mutate();
    };

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Change Password</h2>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Current Password</label>
                    <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">New Password</label>
                    <input type="password" required value={next} onChange={(e) => setNext(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Confirm New</label>
                    <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                {error && <p className="sm:col-span-3 text-sm text-alert">{error}</p>}
                <div className="sm:col-span-3">
                    <button type="submit" disabled={change.isPending}
                        className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                        {change.isPending ? "Updating…" : "Update Password"}
                    </button>
                    {change.isSuccess && <span className="ml-3 text-sm text-secondary">Password changed!</span>}
                </div>
            </form>
        </section>
    );
}

/* ── Household ────────────────────────────────────────────── */
function HouseholdSection() {
    const qc = useQueryClient();
    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => settingsApi.getProfile().then((r) => r.data),
    });

    const [name, setName] = useState("");
    const [budget, setBudget] = useState("");

    useEffect(() => {
        if (profile) {
            setName(profile.household_name || "");
            setBudget(String(profile.budget_limit ?? "600"));
        }
    }, [profile]);

    const update = useMutation({
        mutationFn: () =>
            settingsApi.updateHousehold({
                name: name || undefined,
                budget_limit: budget ? parseFloat(budget) : undefined,
            }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
    });

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Household</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); update.mutate(); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Household Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Monthly Budget Limit ($)</label>
                    <input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                    <button type="submit" disabled={update.isPending}
                        className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                        {update.isPending ? "Saving…" : "Save Household"}
                    </button>
                    {update.isSuccess && <span className="ml-3 text-sm text-secondary">Saved!</span>}
                </div>
            </form>
        </section>
    );
}

/* ── Invite ───────────────────────────────────────────────── */
function InviteSection() {
    const [code, setCode] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [copied, setCopied] = useState(false);

    const generate = useMutation({
        mutationFn: () => settingsApi.generateInvite(),
        onSuccess: (r) => setCode(r.data.invite_code),
    });

    const join = useMutation({
        mutationFn: () => settingsApi.joinHousehold(joinCode),
        onSuccess: () => { setJoinCode(""); window.location.reload(); },
    });

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Invite & Join</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Generate */}
                <div>
                    <p className="text-sm text-gray-700 mb-2">Generate a code to invite others to your household:</p>
                    <button onClick={() => generate.mutate()} disabled={generate.isPending}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                        <RefreshCw className="w-3.5 h-3.5" /> Generate Invite Code
                    </button>
                    {code && (
                        <div className="mt-3 flex items-center gap-2">
                            <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono">{code}</code>
                            <button onClick={copyCode} className="text-neutral hover:text-gray-800">
                                {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
                {/* Join */}
                <div>
                    <p className="text-sm text-gray-700 mb-2">Or join an existing household with a code:</p>
                    <form onSubmit={(e) => { e.preventDefault(); join.mutate(); }} className="flex gap-2">
                        <input required value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter invite code"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <button type="submit" disabled={join.isPending}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                            Join
                        </button>
                    </form>
                    {join.isError && <p className="mt-2 text-sm text-alert">{(join.error as any)?.response?.data?.detail || "Invalid code"}</p>}
                </div>
            </div>
        </section>
    );
}

/* ── Members ──────────────────────────────────────────────── */
function MembersSection() {
    const { data: members = [], isLoading } = useQuery({
        queryKey: ["household-members"],
        queryFn: () => settingsApi.listMembers().then((r) => r.data),
    });

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Household Members</h2>
            </div>
            {isLoading ? (
                <p className="text-sm text-neutral">Loading…</p>
            ) : members.length === 0 ? (
                <p className="text-sm text-neutral">No members found.</p>
            ) : (
                <div className="divide-y divide-gray-100">
                    {members.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm font-medium text-gray-800">{m.full_name || "—"}</p>
                                <p className="text-xs text-neutral">{m.email}</p>
                            </div>
                            <span className="text-xs text-neutral">
                                Joined {new Date(m.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ── Data Export ───────────────────────────────────────────── */
function ExportSection() {
    const [exportingPantry, setExportingPantry] = useState(false);
    const [exportingTx, setExportingTx] = useState(false);

    const downloadBlob = (data: Blob, filename: string) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPantry = async () => {
        setExportingPantry(true);
        try {
            const { data } = await settingsApi.exportPantry();
            downloadBlob(data, "pantry_export.csv");
        } finally {
            setExportingPantry(false);
        }
    };

    const exportTransactions = async () => {
        setExportingTx(true);
        try {
            const { data } = await settingsApi.exportTransactions();
            downloadBlob(data, "transactions_export.csv");
        } finally {
            setExportingTx(false);
        }
    };

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Export Data</h2>
            </div>
            <p className="text-sm text-gray-700 mb-3">Download your data as CSV files.</p>
            <div className="flex gap-3">
                <button onClick={exportPantry} disabled={exportingPantry}
                    className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 disabled:opacity-50">
                    <Download className="w-3.5 h-3.5" /> {exportingPantry ? "Exporting…" : "Pantry Data"}
                </button>
                <button onClick={exportTransactions} disabled={exportingTx}
                    className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 disabled:opacity-50">
                    <Download className="w-3.5 h-3.5" /> {exportingTx ? "Exporting…" : "Transactions"}
                </button>
            </div>
        </section>
    );
}
