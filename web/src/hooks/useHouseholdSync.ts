/**
 * useHouseholdSync — Phase 3
 * WebSocket hook that connects to the household real-time sync endpoint.
 * Automatically invalidates TanStack Query caches when events arrive.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/ws";

const EVENT_INVALIDATIONS: Record<string, string[][]> = {
    pantry_updated: [["pantry"], ["expiring"]],
    receipt_confirmed: [["receipts"], ["pantry"], ["expiring"], ["budget"]],
    goal_updated: [["goals"]],
    bank_synced: [["bank-transactions"]],
};

export function useHouseholdSync(householdId: string | null | undefined) {
    const qc = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        if (!householdId) return;
        const token = localStorage.getItem("hb_token");
        if (!token) return;

        const url = `${WS_BASE}/${householdId}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[Tracker] Real-time sync connected");
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
            // Reconnect after 5 seconds on unexpected close
            reconnectTimer.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [householdId, qc]);

    useEffect(() => {
        connect();
        return () => {
            reconnectTimer.current && clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);
}
