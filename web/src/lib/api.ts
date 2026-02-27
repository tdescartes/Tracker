import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("tracker_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("tracker_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;

// ── Typed API helpers ────────────────────────────────────────

export const authApi = {
    register: (data: {
        name: string;
        email: string;
        admin_first_name: string;
        admin_last_name: string;
        admin_email: string;
        admin_password: string;
    }) => api.post("/api/auth/register", data),
    login: (email: string, password: string) =>
        api.post("/api/auth/login", { email, password }),
    me: () => api.get("/api/auth/me"),
};

export const pantryApi = {
    list: (filters?: { location?: string; status?: string }) =>
        api.get("/api/pantry/", { params: filters }),
    expiringSoon: (days = 3) => api.get(`/api/pantry/expiring-soon?days=${days}`),
    shoppingList: () => api.get("/api/pantry/shopping-list"),
    addItem: (data: object) => api.post("/api/pantry/", data),
    updateItem: (id: string, data: object) => api.patch(`/api/pantry/${id}`, data),
    deleteItem: (id: string) => api.delete(`/api/pantry/${id}`),
};

export const receiptApi = {
    upload: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        // OCR + AI structuring can take 15–45s on CPU — give it 2 full minutes
        return api.post("/api/receipts/upload", form, { timeout: 120_000 });
    },
    confirm: (id: string, data: object) => api.post(`/api/receipts/${id}/confirm`, data),
    list: () => api.get("/api/receipts/"),
};

export const budgetApi = {
    summary: (year: number, month: number, limit?: number) =>
        api.get(`/api/budget/summary/${year}/${month}`, { params: { budget_limit: limit } }),
    inflation: (itemName: string) => api.get(`/api/budget/inflation/${itemName}`),
    reportCard: (year: number, month: number) => api.get(`/api/budget/report-card/${year}/${month}`),
    surplus: (year: number, month: number) => api.get(`/api/budget/surplus/${year}/${month}`),
};

export const insightsApi = {
    list: () => api.get("/api/insights/"),
};

export const chatApi = {
    send: (message: string) => api.post("/api/chat/", { message }),
};

export const bankApi = {
    upload: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        // OCR + AI structuring can take 15–45s on CPU — give it 2 full minutes
        return api.post("/api/bank/upload-statement", form, { timeout: 120_000 });
    },
    transactions: () => api.get("/api/bank/transactions"),
    reconcile: () => api.post("/api/bank/reconcile"),
};

// Phase 2 — Recipes
export const recipesApi = {
    suggestions: (expiringFirst = true, limit = 8) =>
        api.get(`/api/recipes/suggestions?expiring_first=${expiringFirst}&limit=${limit}`),
    search: (q: string) => api.get(`/api/recipes/search?q=${encodeURIComponent(q)}`),
};

// Phase 2 — Notifications
export const notificationsApi = {
    list: (unreadOnly = false) => api.get(`/api/notifications/?unread_only=${unreadOnly}`),
    markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
    markAllRead: () => api.post("/api/notifications/read-all"),
    registerToken: (token: string, platform: "expo" | "web" = "expo") =>
        api.post("/api/notifications/token", { token, platform }),
    unregisterToken: (token: string) =>
        api.delete("/api/notifications/token", { data: { token } }),
};

// Phase 3 — Plaid
export const plaidApi = {
    createLinkToken: () => api.post("/api/plaid/link-token"),
    exchangeToken: (publicToken: string, accountName?: string) =>
        api.post("/api/plaid/exchange-token", { public_token: publicToken, account_name: accountName }),
    linkedItems: () => api.get("/api/plaid/linked-items"),
    sync: (itemId: string, daysBack = 30) =>
        api.post("/api/plaid/sync", { item_id: itemId, days_back: daysBack }),
    unlink: (id: string) => api.delete(`/api/plaid/items/${id}`),
};

// Settings — profile, household, export
export const settingsApi = {
    getProfile: () => api.get("/api/settings/profile"),
    updateProfile: (data: { full_name?: string; email?: string }) =>
        api.patch("/api/settings/profile", data),
    changePassword: (data: { current_password: string; new_password: string }) =>
        api.post("/api/settings/change-password", data),
    updateHousehold: (data: { name?: string; currency_code?: string; budget_limit?: number }) =>
        api.patch("/api/settings/household", data),
    generateInvite: () => api.post("/api/settings/household/generate-invite"),
    joinHousehold: (inviteCode: string) =>
        api.post("/api/settings/household/join", { invite_code: inviteCode }),
    listMembers: () => api.get("/api/settings/household/members"),
    exportPantry: () => api.get("/api/settings/export/pantry", { responseType: "blob" }),
    exportTransactions: () => api.get("/api/settings/export/transactions", { responseType: "blob" }),
};

// Goals — updated with PATCH
export const goalsApi = {
    list: () => api.get("/api/goals/"),
    create: (data: object) => api.post("/api/goals/", data),
    update: (id: string, data: object) => api.patch(`/api/goals/${id}`, data),
    delete: (id: string) => api.delete(`/api/goals/${id}`),
};

// Re-export the base instance for ad-hoc calls
export { api };
