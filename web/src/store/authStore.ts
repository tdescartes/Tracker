import { create } from "zustand";
import { authApi } from "@/lib/api";

interface User {
    id: string;
    email: string;
    full_name: string | null;
    household_id: string | null;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: { email: string; password: string; full_name?: string; household_name?: string }) => Promise<void>;
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
