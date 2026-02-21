import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi } from "../lib/api";

interface User { id: string; email: string; full_name: string | null; household_id: string | null; }
interface AuthState {
    user: User | null; token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (d: { email: string; password: string; full_name?: string; household_name?: string }) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null, token: null,
    login: async (email, password) => {
        const { data } = await authApi.login(email, password);
        await SecureStore.setItemAsync("tracker_token", data.access_token);
        set({ user: data.user, token: data.access_token });
    },
    register: async (payload) => {
        const { data } = await authApi.register(payload);
        await SecureStore.setItemAsync("tracker_token", data.access_token);
        set({ user: data.user, token: data.access_token });
    },
    logout: async () => {
        await SecureStore.deleteItemAsync("tracker_token");
        set({ user: null, token: null });
    },
    hydrate: async () => {
        const token = await SecureStore.getItemAsync("tracker_token");
        if (!token) return false;
        try {
            const { data } = await authApi.me();
            set({ user: data, token });
            return true;
        } catch {
            await SecureStore.deleteItemAsync("tracker_token");
            return false;
        }
    },
}));
