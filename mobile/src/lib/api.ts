import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("tracker_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync("tracker_token");
        }
        return Promise.reject(error);
    }
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
    register: (d: { email: string; password: string; full_name?: string; household_name?: string }) =>
        api.post("/api/auth/register", d),
    login: (email: string, password: string) =>
        api.post(
            "/api/auth/login",
            new URLSearchParams({ username: email, password }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        ),
    me: () => api.get("/api/auth/me"),
};

// ── Pantry ───────────────────────────────────────────────────
export const pantryApi = {
    list: (params?: object) => api.get("/api/pantry/", { params }),
    expiringSoon: (days = 3) => api.get(`/api/pantry/expiring-soon?days=${days}`),
    shoppingList: () => api.get("/api/pantry/shopping-list"),
    addItem: (data: object) => api.post("/api/pantry/", data),
    update: (id: string, data: object) => api.patch(`/api/pantry/${id}`, data),
    deleteItem: (id: string) => api.delete(`/api/pantry/${id}`),
};

// ── Receipts ─────────────────────────────────────────────────
export const receiptApi = {
    upload: (imageUri: string) => {
        const form = new FormData();
        form.append("file", { uri: imageUri, type: "image/jpeg", name: "receipt.jpg" } as any);
        return api.post("/api/receipts/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120_000,
        });
    },
    confirm: (id: string, data: object) => api.post(`/api/receipts/${id}/confirm`, data),
    list: () => api.get("/api/receipts/"),
};

// ── Budget ───────────────────────────────────────────────────
export const budgetApi = {
    summary: (year: number, month: number, limit?: number) =>
        api.get(`/api/budget/summary/${year}/${month}`, { params: { budget_limit: limit } }),
    inflation: (itemName: string) => api.get(`/api/budget/inflation/${itemName}`),
    reportCard: (year: number, month: number) => api.get(`/api/budget/report-card/${year}/${month}`),
    surplus: (year: number, month: number) => api.get(`/api/budget/surplus/${year}/${month}`),
};

// ── Insights ─────────────────────────────────────────────────
export const insightsApi = {
    list: () => api.get("/api/insights/"),
};

// ── Chat ─────────────────────────────────────────────────────
export const chatApi = {
    send: (message: string) => api.post("/api/chat/", { message }),
};

// ── Recipes ──────────────────────────────────────────────────
export const recipesApi = {
    suggestions: (expiringFirst = true, limit = 8) =>
        api.get(`/api/recipes/suggestions?expiring_first=${expiringFirst}&limit=${limit}`),
    search: (q: string) => api.get(`/api/recipes/search?q=${encodeURIComponent(q)}`),
};

// ── Notifications ────────────────────────────────────────────
export const notificationsApi = {
    registerToken: (token: string, platform: "expo" | "web" = "expo") =>
        api.post("/api/notifications/token", { token, platform }),
    unregisterToken: (token: string) =>
        api.delete("/api/notifications/token", { data: { token } }),
    list: (unreadOnly = false) =>
        api.get(`/api/notifications/?unread_only=${unreadOnly}`),
    markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
    markAllRead: () => api.post("/api/notifications/read-all"),
};

// ── Goals ────────────────────────────────────────────────────
export const goalsApi = {
    list: () => api.get("/api/goals/"),
    create: (data: object) => api.post("/api/goals/", data),
    update: (id: string, data: object) => api.patch(`/api/goals/${id}`, data),
    delete: (id: string) => api.delete(`/api/goals/${id}`),
};

// ── Bank ─────────────────────────────────────────────────────
export const bankApi = {
    transactions: (params?: { category?: string; type?: string }) =>
        api.get("/api/bank/transactions", { params }),
    upload: (fileUri: string, mimeType = "application/pdf", fileName = "statement.pdf") => {
        const form = new FormData();
        form.append("file", { uri: fileUri, type: mimeType, name: fileName } as any);
        return api.post("/api/bank/upload-statement", form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120_000,
        });
    },
    reconcile: () => api.post("/api/bank/reconcile"),
};

// ── Plaid ────────────────────────────────────────────────────
export const plaidApi = {
    linkToken: () => api.post("/api/plaid/link-token"),
    exchangeToken: (publicToken: string, accountName?: string) =>
        api.post("/api/plaid/exchange-token", { public_token: publicToken, account_name: accountName }),
    linkedItems: () => api.get("/api/plaid/linked-items"),
    sync: (itemId: string, daysBack = 30) =>
        api.post("/api/plaid/sync", { item_id: itemId, days_back: daysBack }),
    unlink: (id: string) => api.delete(`/api/plaid/items/${id}`),
};

// ── Settings — profile, household, export ────────────────────
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
