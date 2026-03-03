import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface LiveQueryEntry {
  time: string;
  client_ip: string;
  question: string;
  qtype: string;
  status: string;
  reason?: string | null;
  elapsed_ns?: number | null;
  upstream_ns?: number | null;
  upstream?: string | null;
  _key: string; // unique display key
}

interface Options {
  maxEntries?: number;
}

/**
 * Fetch a one-time WebSocket ticket from the server.
 * This avoids placing the long-lived JWT in the WebSocket URL
 * (which would expose it in server logs, browser history, and Referer headers).
 */
async function fetchWsTicket(token: string): Promise<string | null> {
  try {
    const resp = await fetch('/api/v1/ws/ticket', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

export function useQueryLogWebSocket({ maxEntries = 100 }: Options = {}) {
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const [liveEntries, setLiveEntries] = useState<LiveQueryEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const mountedRef = useRef(true);
  const counterRef = useRef(0);
  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const clearEntries = useCallback(() => setLiveEntries([]), []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    setWsStatus('connecting');

    // Obtain a one-time ticket; the JWT never appears in the WS URL
    const ticket = await fetchWsTicket(token);
    if (!ticket || !mountedRef.current) {
      setWsStatus('error');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/v1/ws/query-log?ticket=${encodeURIComponent(ticket)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setWsStatus('connected');
      reconnectCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const entry: LiveQueryEntry = {
          ...data,
          _key: `${data.time}-${data.question}-${++counterRef.current}`,
        };
        setLiveEntries((prev) => {
          const next = [entry, ...prev];
          return next.length > maxEntries ? next.slice(0, maxEntries) : next;
        });
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setWsStatus('error');
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!mountedRef.current) return;
      setWsStatus('disconnected');
      // Exponential backoff: 1s, 2s, 4s, ... max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
      reconnectCountRef.current++;
      // Use connectRef to avoid referencing connect before its declaration
      reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
    };
  }, [maxEntries]);

  useEffect(() => {
    connectRef.current = connect;
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- connect() is async; setState (setWsStatus) is deferred to WS event callbacks, not synchronous
    connect();
    return () => {
      mountedRef.current = false;
      connectRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { wsStatus, liveEntries, clearEntries };
}
