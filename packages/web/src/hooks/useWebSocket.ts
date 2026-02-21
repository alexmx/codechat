import { useEffect, useRef, useCallback, useState } from 'react';
import type { ClientMessage, ServerMessage } from '../types';

type Status = 'connecting' | 'connected' | 'disconnected';

const MAX_BACKOFF = 10_000;

export function useWebSocket(onMessage: (msg: ServerMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState<Status>('connecting');

  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    let unmounted = false;
    let done = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let backoff = 1_000;
    let initReceived = false;

    function flushQueue(ws: WebSocket) {
      while (queueRef.current.length > 0) {
        ws.send(queueRef.current.shift()!);
      }
    }

    function connect() {
      if (unmounted || done) return;
      setStatus('connecting');
      initReceived = false;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      wsRef.current = ws;

      ws.onopen = () => {
        backoff = 1_000;
      };

      ws.onclose = () => {
        if (unmounted || done) return;
        setStatus('disconnected');
        reconnectTimer = setTimeout(() => {
          backoff = Math.min(backoff * 2, MAX_BACKOFF);
          connect();
        }, backoff);
      };

      ws.onerror = () => {
        // onclose will fire after onerror — reconnect is handled there
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          if (msg.type === 'review_complete') done = true;
          if (msg.type === 'init') {
            initReceived = true;
            setStatus('connected');
            onMessageRef.current(msg);
            flushQueue(ws);
          } else {
            onMessageRef.current(msg);
          }
        } catch { /* ignore malformed */ }
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const data = JSON.stringify(msg);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      queueRef.current.push(data);
    }
  }, []);

  return { send, status };
}
