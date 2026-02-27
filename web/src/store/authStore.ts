import { create } from "zustand";
import { authApi } from "@/lib/api";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_id: string;
    role: string;
    is_active: boolean;
    employee_id?: string | null;
    last_login?: string | null;
    created_at: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        name: string;
        email: string;
        admin_first_name: string;
        admin_last_name: string;
        admin_email: string;
        admin_password: string;
    }) => Promise<void>;
    logout: () => void;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: false,

    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const { data } = await authApi.login(email, password);
            localStorage.setItem("tracker_token", data.access_token);
            set({ user: data.user, token: data.access_token });
        } finally {
            set({ isLoading: false });
        }
    },

    register: async (payload) => {
        set({ isLoading: true });
        try {
            const { data } = await authApi.register(payload);
            localStorage.setItem("tracker_token", data.access_token);
            set({ user: data.user, token: data.access_token });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: () => {
        localStorage.removeItem("tracker_token");
        set({ user: null, token: null });
    },

    hydrate: async () => {
        const token = localStorage.getItem("tracker_token");
        if (!token) return;
        try {
            const { data } = await authApi.me();
            set({ user: data, token });
        } catch {
            localStorage.removeItem("tracker_token");
        }
    },
}));
