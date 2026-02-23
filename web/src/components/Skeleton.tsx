import clsx from "clsx";

/* ── Base skeleton block ─────────────────────────────────── */
export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={clsx("animate-pulse rounded-lg bg-gray-200", className)}
            {...props}
        />
    );
}

/* ── Preset shapes ───────────────────────────────────────── */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={clsx("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={clsx("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={clsx("bg-white rounded-xl border border-gray-200 p-4", className)}>
            <Skeleton className="h-3 w-1/3 mb-3" />
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    );
}

/* ── Dashboard skeleton ──────────────────────────────────── */
export function DashboardSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Greeting */}
            <Skeleton className="h-7 w-64 mb-6" />

            {/* Action banner */}
            <Skeleton className="h-20 w-full rounded-xl mb-6" />

            {/* Stat cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <Skeleton className="h-4 w-28 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <Skeleton className="h-4 w-32 mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <Skeleton className="h-4 w-28 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="text-center">
                            <Skeleton className="h-8 w-12 mx-auto mb-1" />
                            <Skeleton className="h-3 w-16 mx-auto" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Expiring section */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <Skeleton className="h-4 w-44 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Pantry skeleton ─────────────────────────────────────── */
export function PantrySkeleton() {
    return (
        <div className="animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex justify-between mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Shopping list skeleton ──────────────────────────────── */
export function ShoppingSkeleton() {
    return (
        <div className="animate-pulse bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-7 w-16 rounded-lg" />
                        <Skeleton className="h-7 w-8 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Budget skeleton ─────────────────────────────────────── */
export function BudgetSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            {/* Progress bar area */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full rounded-full mb-2" />
                <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <Skeleton className="h-4 w-36 mb-4" />
                    <Skeleton className="h-48 w-48 rounded-full mx-auto" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <Skeleton className="h-4 w-32 mb-4" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-4/5 mb-2" />
                    <Skeleton className="h-3 w-3/5 mb-2" />
                    <Skeleton className="h-3 w-2/5" />
                </div>
            </div>

            {/* Report card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <Skeleton className="h-4 w-28 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-6 w-20 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Transactions skeleton ───────────────────────────────── */
export function TransactionsSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            {/* Upload area */}
            <Skeleton className="h-32 w-full rounded-xl" />

            {/* Report card */}
            <Skeleton className="h-24 w-full rounded-xl" />

            {/* Transaction rows */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Goals skeleton ──────────────────────────────────────── */
export function GoalsSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            {/* Surplus banner */}
            <Skeleton className="h-16 w-full rounded-xl" />

            {/* Goal cards */}
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex justify-between mb-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full mb-2" />
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Receipts skeleton ───────────────────────────────────── */
export function ReceiptsSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="px-5 py-4 flex justify-between">
                        <div>
                            <Skeleton className="h-4 w-28 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Settings profile skeleton ───────────────────────────── */
export function ProfileSkeleton() {
    return (
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div>
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-9 w-full rounded-lg" />
            </div>
        </div>
    );
}

/* ── Members skeleton ────────────────────────────────────── */
export function MembersSkeleton() {
    return (
        <div className="animate-pulse divide-y divide-gray-100">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>
    );
}
