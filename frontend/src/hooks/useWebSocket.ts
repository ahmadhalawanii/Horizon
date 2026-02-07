import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WsStatus = "connected" | "reconnecting" | "disconnected";

interface TelemetryMessage {
  type: "telemetry_update";
  device_id: number;
  room_id: number;
  power_kw: number;
  temp_c: number | null;
  status: string;
  ts: string;
}

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/live";
const MAX_RETRY_DELAY = 30_000;

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<TelemetryMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        retryCount.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryMessage = JSON.parse(event.data);
          setLastMessage(data);
          // Invalidate twin state so device cards update
          queryClient.invalidateQueries({ queryKey: ["twin-state"] });
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** retryCount.current, MAX_RETRY_DELAY);
        retryCount.current += 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setStatus("disconnected");
    }
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, lastMessage };
}
