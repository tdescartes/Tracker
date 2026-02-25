import { useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, StyleSheet, Alert, Switch, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { settingsApi, notificationsApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { ProfileSkeleton } from "../../src/components/Skeleton";

export default function ProfileScreen() {
    const qc = useQueryClient();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [section, setSection] = useState<string | null>(null);

    // ── Profile data ──────────────────────────────────────────
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => settingsApi.getProfile().then((r) => r.data),
    });

    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ["household-members"],
        queryFn: () => settingsApi.listMembers().then((r) => r.data),
    });

    const { data: notifData, isLoading: notifsLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => notificationsApi.list().then((r) => r.data),
        refetchInterval: 60_000,
    });

    const unreadCount: number = notifData?.unread_count ?? 0;
    const notifications: any[] = notifData?.notifications ?? [];

    const markAll = useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const markOne = useMutation({
        mutationFn: (id: string) => notificationsApi.markRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const handleLogout = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => { logout(); router.replace("/(auth)/login"); } },
        ]);
    };

    const typeIcon = (type: string) =>
        type === "alert" ? "🔴" : type === "warning" ? "🟡" : type === "success" ? "🟢" : "🔵";

    const isInitialLoading = profileLoading && !profile;

    return (
        <ScrollView style={s.screen} contentContainerStyle={s.container}>
            {isInitialLoading ? <ProfileSkeleton /> : <>
                {/* User header */}
                <View style={s.header}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>
                            {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={s.name}>{user?.full_name || "User"}</Text>
                        <Text style={s.email}>{user?.email}</Text>
                    </View>
                </View>

                {/* Menu sections */}
                <SectionButton
                    icon="👤" label="Edit Profile" active={section === "profile"}
                    onPress={() => setSection(section === "profile" ? null : "profile")}
                />
                {section === "profile" && <EditProfileSection onDone={() => setSection(null)} />}

                <SectionButton
                    icon="🔑" label="Change Password" active={section === "password"}
                    onPress={() => setSection(section === "password" ? null : "password")}
                />
                {section === "password" && <ChangePasswordSection onDone={() => setSection(null)} />}

                <SectionButton
                    icon="🏠" label="Household" active={section === "household"}
                    onPress={() => setSection(section === "household" ? null : "household")}
                />
                {section === "household" && (
                    <HouseholdSection profile={profile} members={members} />
                )}

                <SectionButton
                    icon="🔔" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                    active={section === "notifications"}
                    onPress={() => setSection(section === "notifications" ? null : "notifications")}
                    badge={unreadCount}
                />
                {section === "notifications" && (
                    <View style={s.sectionCard}>
                        {unreadCount > 0 && (
                            <TouchableOpacity style={s.markAllBtn} onPress={() => markAll.mutate()}>
                                <Text style={s.markAllText}>Mark all as read</Text>
                            </TouchableOpacity>
                        )}
                        {notifications.length === 0 ? (
                            <Text style={s.emptyText}>All caught up!</Text>
                        ) : (
                            notifications.slice(0, 20).map((n: any) => (
                                <TouchableOpacity
                                    key={n.id}
                                    onPress={() => !n.is_read && markOne.mutate(n.id)}
                                    style={[s.notifRow, !n.is_read && s.unread]}
                                >
                                    <Text style={s.notifIcon}>{typeIcon(n.type)}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.notifTitle}>{n.title}</Text>
                                        <Text style={s.notifBody}>{n.body}</Text>
                                        <Text style={s.notifDate}>
                                            {new Date(n.created_at).toLocaleDateString("en-US", {
                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                <SectionButton
                    icon="📤" label="Export Data" active={section === "export"}
                    onPress={() => setSection(section === "export" ? null : "export")}
                />
                {section === "export" && <ExportSection />}

                {/* Sign out */}
                <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                    <Text style={s.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </>}
        </ScrollView>
    );
}

// ── Section Button ───────────────────────────────────────────
function SectionButton({ icon, label, active, onPress, badge }: {
    icon: string; label: string; active: boolean; onPress: () => void; badge?: number;
}) {
    return (
        <TouchableOpacity style={[s.menuItem, active && s.menuItemActive]} onPress={onPress}>
            <Text style={s.menuIcon}>{icon}</Text>
            <Text style={s.menuLabel}>{label}</Text>
            {(badge ?? 0) > 0 && (
                <View style={s.badgeDot}>
                    <Text style={s.badgeNum}>{badge! > 9 ? "9+" : badge}</Text>
                </View>
            )}
            <Text style={s.chevron}>{active ? "▲" : "▼"}</Text>
        </TouchableOpacity>
    );
}

// ── Edit Profile ─────────────────────────────────────────────
function EditProfileSection({ onDone }: { onDone: () => void }) {
    const qc = useQueryClient();
    const { user } = useAuthStore();
    const [fullName, setFullName] = useState(user?.full_name || "");
    const [email, setEmail] = useState(user?.email || "");

    const mutation = useMutation({
        mutationFn: () => settingsApi.updateProfile({ full_name: fullName, email }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            Toast.show({ type: "success", text1: "Profile updated" });
            onDone();
        },
        onError: () => Alert.alert("Error", "Could not update profile."),
    });

    return (
        <View style={s.sectionCard}>
            <TextInput style={s.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
            <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={s.primaryBtn} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
                <Text style={s.primaryBtnText}>{mutation.isPending ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Change Password ──────────────────────────────────────────
function ChangePasswordSection({ onDone }: { onDone: () => void }) {
    const [current, setCurrent] = useState("");
    const [newPw, setNewPw] = useState("");

    const mutation = useMutation({
        mutationFn: () => settingsApi.changePassword({ current_password: current, new_password: newPw }),
        onSuccess: () => {
            Toast.show({ type: "success", text1: "Password changed" });
            onDone();
        },
        onError: () => Alert.alert("Error", "Check your current password."),
    });

    return (
        <View style={s.sectionCard}>
            <TextInput style={s.input} placeholder="Current password" secureTextEntry value={current} onChangeText={setCurrent} />
            <TextInput style={s.input} placeholder="New password" secureTextEntry value={newPw} onChangeText={setNewPw} />
            <TouchableOpacity style={s.primaryBtn} onPress={() => mutation.mutate()} disabled={mutation.isPending || !current || !newPw}>
                <Text style={s.primaryBtnText}>{mutation.isPending ? "Changing…" : "Change Password"}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Household ────────────────────────────────────────────────
function HouseholdSection({ profile, members }: { profile: any; members: any[] }) {
    const qc = useQueryClient();
    const [householdName, setHouseholdName] = useState(profile?.household_name || "");
    const [budgetLimit, setBudgetLimit] = useState(String(profile?.budget_limit || "600"));
    const [inviteCode, setInviteCode] = useState("");
    const [joinCode, setJoinCode] = useState("");

    const updateHousehold = useMutation({
        mutationFn: () => settingsApi.updateHousehold({
            name: householdName, budget_limit: parseFloat(budgetLimit) || 600,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            Toast.show({ type: "success", text1: "Household updated" });
        },
    });

    const generateInvite = useMutation({
        mutationFn: () => settingsApi.generateInvite(),
        onSuccess: (res) => {
            setInviteCode(res.data.invite_code || res.data.code || "");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
    });

    const joinHousehold = useMutation({
        mutationFn: () => settingsApi.joinHousehold(joinCode),
        onSuccess: () => {
            Toast.show({ type: "success", text1: "Joined household!" });
            qc.invalidateQueries({ queryKey: ["profile"] });
            setJoinCode("");
        },
        onError: () => Alert.alert("Error", "Invalid invite code."),
    });

    const shareInvite = async () => {
        if (!inviteCode) return;
        try {
            const file = new ExpoFile(Paths.cache, "invite.txt");
            if (!file.exists) file.create();
            file.write(`Join my Tracker household! Code: ${inviteCode}`);
            await Sharing.shareAsync(file.uri, { mimeType: "text/plain" });
        } catch { /* user cancelled */ }
    };

    return (
        <View style={s.sectionCard}>
            <TextInput style={s.input} placeholder="Household name" value={householdName} onChangeText={setHouseholdName} />
            <TextInput style={s.input} placeholder="Monthly budget $" value={budgetLimit} onChangeText={setBudgetLimit} keyboardType="numeric" />
            <TouchableOpacity style={s.primaryBtn} onPress={() => updateHousehold.mutate()} disabled={updateHousehold.isPending}>
                <Text style={s.primaryBtnText}>{updateHousehold.isPending ? "Saving…" : "Update Household"}</Text>
            </TouchableOpacity>

            {/* Invite */}
            <Text style={s.subTitle}>Invite Members</Text>
            <TouchableOpacity style={s.outlineBtn} onPress={() => generateInvite.mutate()}>
                <Text style={s.outlineBtnText}>{generateInvite.isPending ? "Generating…" : "Generate Invite Code"}</Text>
            </TouchableOpacity>
            {inviteCode !== "" && (
                <View style={s.inviteRow}>
                    <Text style={s.inviteCode}>{inviteCode}</Text>
                    <TouchableOpacity onPress={shareInvite}>
                        <Text style={s.shareLink}>Share</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Join */}
            <Text style={s.subTitle}>Join a Household</Text>
            <View style={s.joinRow}>
                <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Enter invite code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="none" />
                <TouchableOpacity style={s.joinBtn} onPress={() => joinHousehold.mutate()} disabled={!joinCode || joinHousehold.isPending}>
                    <Text style={s.joinBtnText}>Join</Text>
                </TouchableOpacity>
            </View>

            {/* Members */}
            {members.length > 0 && (
                <>
                    <Text style={s.subTitle}>Members</Text>
                    {members.map((m: any) => (
                        <View key={m.id} style={s.memberRow}>
                            <View style={s.memberAvatar}>
                                <Text style={s.memberAvatarText}>{(m.full_name || m.email).charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={s.memberName}>{m.full_name || m.email}</Text>
                                <Text style={s.memberEmail}>{m.email}</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}
        </View>
    );
}

// ── Export ────────────────────────────────────────────────────
function ExportSection() {
    const [exporting, setExporting] = useState(false);

    const doExport = async (type: "pantry" | "transactions") => {
        setExporting(true);
        try {
            const fn = type === "pantry" ? settingsApi.exportPantry : settingsApi.exportTransactions;
            const { data } = await fn();
            const file = new ExpoFile(Paths.cache, `${type}_export.csv`);
            if (!file.exists) file.create();
            // data is a blob — convert to base64 through arraybuffer
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(",")[1];
                file.write(base64, { encoding: "base64" });
                await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
            };
            reader.readAsDataURL(data);
        } catch {
            Alert.alert("Error", "Could not export data.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <View style={s.sectionCard}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => doExport("pantry")} disabled={exporting}>
                <Text style={s.outlineBtnText}>📦 Export Pantry (CSV)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.outlineBtn, { marginTop: 8 }]} onPress={() => doExport("transactions")} disabled={exporting}>
                <Text style={s.outlineBtnText}>💳 Export Transactions (CSV)</Text>
            </TouchableOpacity>
            {exporting && <ActivityIndicator color="#006994" style={{ marginTop: 12 }} />}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16, paddingBottom: 40 },

    // Header
    header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#006994", alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
    name: { fontSize: 18, fontWeight: "700", color: "#111827" },
    email: { fontSize: 13, color: "#708090" },

    // Menu items
    menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
    menuItemActive: { borderColor: "#006994", backgroundColor: "#f0f9ff" },
    menuIcon: { fontSize: 18, marginRight: 12 },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
    chevron: { fontSize: 12, color: "#9ca3af" },
    badgeDot: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginRight: 8 },
    badgeNum: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // Section card
    sectionCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 8, marginTop: -4, borderWidth: 1, borderColor: "#e5e7eb" },

    // Inputs
    input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },

    // Buttons
    primaryBtn: { backgroundColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    outlineBtn: { borderWidth: 1.5, borderColor: "#006994", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
    outlineBtnText: { color: "#006994", fontWeight: "600", fontSize: 14 },

    // Household
    subTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginTop: 16, marginBottom: 8 },
    inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", borderRadius: 8, padding: 12, marginTop: 8 },
    inviteCode: { fontSize: 16, fontWeight: "700", color: "#166534", letterSpacing: 1 },
    shareLink: { color: "#006994", fontWeight: "600", fontSize: 14 },
    joinRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    joinBtn: { backgroundColor: "#006994", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
    joinBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
    memberAvatarText: { fontSize: 14, fontWeight: "600", color: "#374151" },
    memberName: { fontSize: 14, fontWeight: "500", color: "#111827" },
    memberEmail: { fontSize: 12, color: "#708090" },

    // Notifications
    markAllBtn: { backgroundColor: "#006994", borderRadius: 8, paddingVertical: 8, alignItems: "center", marginBottom: 10 },
    markAllText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    emptyText: { textAlign: "center", color: "#708090", paddingVertical: 16, fontSize: 14 },
    notifRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    unread: { backgroundColor: "#f0f9ff", marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 8 },
    notifIcon: { fontSize: 16, marginTop: 2 },
    notifTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
    notifBody: { fontSize: 13, color: "#6b7280", marginTop: 2, lineHeight: 18 },
    notifDate: { fontSize: 11, color: "#9ca3af", marginTop: 4 },

    // Logout
    logoutBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ef4444", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});
