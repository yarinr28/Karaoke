import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { SessionState, QueueItem } from '../types';

export function useQueue(sessionCode: string | null) {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    if (!sessionCode) return;
    const socket = getSocket();

    const handleUpdate = (data: { session: SessionState }) => {
      setSession(data.session);
    };

    socket.on('queue:updated', handleUpdate);

    // Fetch initial state
    socket.emit('queue:get', { code: sessionCode }, (res: { session: SessionState }) => {
      if (res?.session) setSession(res.session);
    });

    return () => {
      socket.off('queue:updated', handleUpdate);
    };
  }, [sessionCode]);

  const add = useCallback(
    (item: Omit<QueueItem, 'id'>) => {
      if (!sessionCode) return;
      const socket = getSocket();
      socket.emit('queue:add', { code: sessionCode, item });
    },
    [sessionCode],
  );

  const remove = useCallback(
    (itemId: string) => {
      if (!sessionCode) return;
      getSocket().emit('queue:remove', { code: sessionCode, itemId });
    },
    [sessionCode],
  );

  const reorder = useCallback(
    (orderedIds: string[]) => {
      if (!sessionCode) return;
      getSocket().emit('queue:reorder', { code: sessionCode, orderedIds });
    },
    [sessionCode],
  );

  const next = useCallback(() => {
    if (!sessionCode) return;
    getSocket().emit('queue:next', { code: sessionCode });
  }, [sessionCode]);

  return { session, add, remove, reorder, next };
}
