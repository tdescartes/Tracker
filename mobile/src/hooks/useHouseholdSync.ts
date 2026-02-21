/**
 * useHouseholdSync — Mobile WebSocket hook for real-time household sync.
 * Mirrors the web version but uses React Native-compatible APIs.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

const WS_BASE = process.env.API_URL
    ? process.env.API_URL.replace(/^http/, "ws") + "/api/ws"
    : "ws://localhost:8000/api/ws";

const EVENT_INVALIDATIONS: Record<string, string[][]> = {
    pantry_updated: [["pantry"], ["expiring"], ["shopping-list"]],
    receipt_confirmed: [["receipts"], ["pantry"], ["expiring"], ["budget"]],
    goal_updated: [["goals"]],
    bank_synced: [["bank-transactions"], ["budget"]],
    notification: [["notifications"]],
};

export function useHouseholdSync(householdId: string | null | undefined) {
    const qc = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(async () => {
        if (!householdId) return;
        const token = await SecureStore.getItemAsync("tracker_token");
        if (!token) return;

        const url = `${WS_BASE}/${householdId}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[Tracker] Mobile real-time sync connected");
        };

        ws.onmessage = (event) => {
            try {
                const { event: eventName } = JSON.parse(event.data);
                const keysToInvalidate = EVENT_INVALIDATIONS[eventName];
                if (keysToInvalidate) {
                    keysToInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
                }
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            reconnectTimer.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [householdId, qc]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect on intentional close
                wsRef.current.close();
            }
        };
    }, [connect]);
}
