import { io, Socket } from 'socket.io-client';
import { QueueItem, SessionState } from '../types';

const SERVER =
  import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function createSession(): Promise<{ code: string; session: SessionState }> {
  return emit('session:create', {});
}

export function joinSession(code: string): Promise<{ code: string; session: SessionState } | { error: string }> {
  return emit('session:join', { code });
}

export function addToQueue(
  code: string,
  item: Omit<QueueItem, 'id'>,
): Promise<{ ok: boolean; item: QueueItem }> {
  return emit('queue:add', { code, item });
}

export function removeFromQueue(code: string, itemId: string): Promise<{ ok: boolean }> {
  return emit('queue:remove', { code, itemId });
}

export function reorderQueue(code: string, orderedIds: string[]): Promise<{ ok: boolean }> {
  return emit('queue:reorder', { code, orderedIds });
}

export function nextInQueue(code: string): Promise<{ ok: boolean; next: QueueItem | null }> {
  return emit('queue:next', { code });
}

export function sendPlaybackUpdate(code: string, isPlaying: boolean, currentTime: number): void {
  getSocket().emit('playback:update', { code, isPlaying, currentTime });
}

function emit<T>(event: string, data: unknown): Promise<T> {
  return new Promise((resolve) => {
    getSocket().emit(event, data, (response: T) => resolve(response));
  });
}
