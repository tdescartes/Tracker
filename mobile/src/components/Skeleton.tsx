import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, Dimensions } from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── Base skeleton block with shimmer ────────────────────── */
export function Skeleton({
    width, height, radius = 8, style,
}: {
    width: number | string;
    height: number;
    radius?: number;
    style?: ViewStyle;
}) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius: radius,
                    backgroundColor: "#e5e7eb",
                    opacity,
                },
                style,
            ]}
        />
    );
}

/* ── Dashboard / Home skeleton ───────────────────────────── */
export function HomeSkeleton() {
    const w = SCREEN_W - 32; // 16px padding each side
    return (
        <View style={sk.container}>
            {/* Greeting */}
            <Skeleton width={200} height={24} style={sk.mb12} />

            {/* Action card */}
            <Skeleton width="100%" height={80} radius={12} style={sk.mb12} />

            {/* Budget pulse card */}
            <Skeleton width="100%" height={120} radius={16} style={sk.mb12} />

            {/* Insights row */}
            <View style={sk.row}>
                <Skeleton width="48%" height={80} radius={12} />
                <Skeleton width="48%" height={80} radius={12} />
            </View>

            {/* This week */}
            <Skeleton width="100%" height={100} radius={16} style={sk.mb12} />

            {/* Expiring section */}
            <Skeleton width={160} height={18} style={sk.mb8} />
            <Skeleton width="100%" height={70} radius={12} style={sk.mb8} />
            <Skeleton width="100%" height={70} radius={12} />
        </View>
    );
}

/* ── Pantry skeleton ─────────────────────────────────────── */
export function PantrySkeleton() {
    return (
        <View style={sk.container}>
            {/* Segment control */}
            <Skeleton width="100%" height={40} radius={10} style={sk.mb12} />

            {/* Filter chips */}
            <View style={[sk.row, sk.mb12]}>
                {[70, 70, 70, 60].map((w, i) => (
                    <Skeleton key={i} width={w} height={32} radius={16} />
                ))}
            </View>

            {/* Item cards */}
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} width="100%" height={72} radius={12} style={sk.mb8} />
            ))}
        </View>
    );
}

/* ── Money/Budget skeleton ───────────────────────────────── */
export function BudgetSkeleton() {
    return (
        <View style={sk.container}>
            {/* Stat card */}
            <Skeleton width="100%" height={100} radius={16} style={sk.mb12} />

            {/* Category breakdown */}
            <Skeleton width={140} height={18} style={sk.mb8} />
            <Skeleton width="100%" height={24} radius={6} style={sk.mb8} />
            <Skeleton width="80%" height={24} radius={6} style={sk.mb8} />
            <Skeleton width="60%" height={24} radius={6} style={sk.mb8} />

            {/* Report card */}
            <Skeleton width="100%" height={120} radius={16} style={{ marginTop: 16 }} />
        </View>
    );
}

/* ── Money/Transactions skeleton ─────────────────────────── */
export function TransactionsSkeleton() {
    return (
        <View style={sk.container}>
            {/* Upload area */}
            <Skeleton width="100%" height={80} radius={12} style={sk.mb12} />

            {/* Transaction rows */}
            {[...Array(6)].map((_, i) => (
                <View key={i} style={[sk.rowBetween, sk.mb8]}>
                    <View>
                        <Skeleton width={140} height={14} style={sk.mb4} />
                        <Skeleton width={80} height={10} />
                    </View>
                    <Skeleton width={60} height={16} />
                </View>
            ))}
        </View>
    );
}

/* ── Money/Goals skeleton ────────────────────────────────── */
export function GoalsSkeleton() {
    return (
        <View style={sk.container}>
            {/* Surplus banner */}
            <Skeleton width="100%" height={50} radius={12} style={sk.mb12} />

            {/* Goal cards */}
            {[...Array(3)].map((_, i) => (
                <View key={i} style={[sk.card, sk.mb12]}>
                    <View style={sk.rowBetween}>
                        <Skeleton width={120} height={16} />
                        <Skeleton width={60} height={16} />
                    </View>
                    <Skeleton width="100%" height={8} radius={4} style={{ marginTop: 12 }} />
                    <View style={[sk.rowBetween, { marginTop: 8 }]}>
                        <Skeleton width={80} height={10} />
                        <Skeleton width={60} height={10} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ── Profile skeleton ────────────────────────────────────── */
export function ProfileSkeleton() {
    return (
        <View style={sk.container}>
            {/* Avatar + name */}
            <View style={[sk.row, { alignItems: "center", gap: 12, marginBottom: 20 }]}>
                <Skeleton width={56} height={56} radius={28} />
                <View>
                    <Skeleton width={140} height={18} style={sk.mb4} />
                    <Skeleton width={180} height={12} />
                </View>
            </View>

            {/* Menu buttons */}
            {[...Array(5)].map((_, i) => (
                <Skeleton key={i} width="100%" height={52} radius={12} style={sk.mb8} />
            ))}
        </View>
    );
}

/* ── Recipe skeleton ─────────────────────────────────────── */
export function RecipeSkeleton() {
    return (
        <View style={sk.container}>
            {/* Search bar */}
            <Skeleton width="100%" height={44} radius={12} style={sk.mb12} />

            {/* Recipe cards */}
            {[...Array(4)].map((_, i) => (
                <View key={i} style={[sk.card, sk.mb12]}>
                    <Skeleton width="70%" height={16} style={sk.mb8} />
                    <Skeleton width="40%" height={12} style={sk.mb8} />
                    <View style={sk.row}>
                        {[50, 60, 50].map((w, j) => (
                            <Skeleton key={j} width={w} height={20} radius={10} />
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ── Shopping skeleton ───────────────────────────────────── */
export function ShoppingSkeleton() {
    return (
        <View style={sk.container}>
            {[...Array(5)].map((_, i) => (
                <View key={i} style={[sk.rowBetween, sk.mb12]}>
                    <View>
                        <Skeleton width={120} height={14} style={sk.mb4} />
                        <Skeleton width={80} height={10} />
                    </View>
                    <View style={[sk.row, { gap: 6 }]}>
                        <Skeleton width={56} height={28} radius={8} />
                        <Skeleton width={28} height={28} radius={8} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ── Shared styles ───────────────────────────────────────── */
const sk = StyleSheet.create({
    container: { padding: 16 },
    row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" },
    mb4: { marginBottom: 4 },
    mb8: { marginBottom: 8 },
    mb12: { marginBottom: 12 },
});
