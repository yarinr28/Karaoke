'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { WsMessage, SessionState } from '@/types';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined'
    ? `ws://${window.location.hostname}:8000/ws/queue`
    : 'ws://localhost:8000/ws/queue');

export function useQueueSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [connected, setConnected] = useState(false);
  const pendingQueue = useRef<WsMessage[]>([]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingQueue.current.push(msg);
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      pendingQueue.current.forEach((m) => ws.send(JSON.stringify(m)));
      pendingQueue.current = [];
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);
      if (msg.type === 'session:created') {
        setSessionCode(msg.payload.code as string);
      } else if (msg.type === 'session:joined') {
        setSessionCode(msg.payload.code as string);
        setSession(msg.payload.session as SessionState);
      } else if (msg.type === 'queue:updated') {
        setSession(msg.payload.session as SessionState);
      }
    };

    return () => ws.close();
  }, []);

  const createSession = useCallback(() => {
    send({ type: 'session:create', payload: {} });
  }, [send]);

  const joinSession = useCallback(
    (code: string) => {
      send({ type: 'session:join', payload: { code } });
    },
    [send],
  );

  const addToQueue = useCallback(
    (item: Omit<import('@/types').QueueItem, 'id'>) => {
      if (!sessionCode) return;
      send({ type: 'queue:add', payload: { code: sessionCode, item } });
    },
    [send, sessionCode],
  );

  const removeFromQueue = useCallback(
    (item_id: string) => {
      if (!sessionCode) return;
      send({ type: 'queue:remove', payload: { code: sessionCode, item_id } });
    },
    [send, sessionCode],
  );

  const reorderQueue = useCallback(
    (ordered_ids: string[]) => {
      if (!sessionCode) return;
      send({ type: 'queue:reorder', payload: { code: sessionCode, ordered_ids } });
    },
    [send, sessionCode],
  );

  const nextInQueue = useCallback(() => {
    if (!sessionCode) return;
    send({ type: 'queue:next', payload: { code: sessionCode } });
  }, [send, sessionCode]);

  return {
    connected,
    sessionCode,
    session,
    createSession,
    joinSession,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    nextInQueue,
  };
}
