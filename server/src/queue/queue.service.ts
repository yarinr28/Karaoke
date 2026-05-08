import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

export interface QueueItem {
  id: string;
  songId: string;
  title: string;
  artist: string;
  duration: number;
  addedBy: string;
  hasInstrumental: boolean;
}

export interface SessionState {
  hostSocketId: string;
  queue: QueueItem[];
  currentItem: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
}

@Injectable()
export class QueueService {
  private sessions = new Map<string, SessionState>();
  // socket → session code
  private socketSession = new Map<string, string>();

  createSession(hostSocketId: string): string {
    const code = this.generateCode();
    this.sessions.set(code, {
      hostSocketId,
      queue: [],
      currentItem: null,
      isPlaying: false,
      currentTime: 0,
    });
    this.socketSession.set(hostSocketId, code);
    return code;
  }

  joinSession(code: string, socketId: string): SessionState | null {
    const session = this.sessions.get(code);
    if (!session) return null;
    this.socketSession.set(socketId, code);
    return session;
  }

  leaveSession(socketId: string): void {
    const code = this.socketSession.get(socketId);
    if (!code) return;
    this.socketSession.delete(socketId);

    const session = this.sessions.get(code);
    if (!session) return;

    // If host disconnects, destroy session
    if (session.hostSocketId === socketId) {
      this.sessions.delete(code);
    }
  }

  getSession(code: string): SessionState | null {
    return this.sessions.get(code) || null;
  }

  getSessionBySocket(socketId: string): { code: string; session: SessionState } | null {
    const code = this.socketSession.get(socketId);
    if (!code) return null;
    const session = this.sessions.get(code);
    if (!session) return null;
    return { code, session };
  }

  addToQueue(code: string, item: Omit<QueueItem, 'id'>): QueueItem {
    const session = this.sessions.get(code);
    if (!session) throw new Error('Session not found');
    const queueItem: QueueItem = { ...item, id: uuid() };
    session.queue.push(queueItem);
    return queueItem;
  }

  removeFromQueue(code: string, itemId: string): void {
    const session = this.sessions.get(code);
    if (!session) throw new Error('Session not found');
    session.queue = session.queue.filter((i) => i.id !== itemId);
  }

  reorderQueue(code: string, orderedIds: string[]): void {
    const session = this.sessions.get(code);
    if (!session) throw new Error('Session not found');
    const map = new Map(session.queue.map((i) => [i.id, i]));
    session.queue = orderedIds.map((id) => map.get(id)).filter(Boolean) as QueueItem[];
  }

  advanceQueue(code: string): QueueItem | null {
    const session = this.sessions.get(code);
    if (!session) throw new Error('Session not found');
    const next = session.queue.shift() || null;
    session.currentItem = next;
    session.isPlaying = !!next;
    session.currentTime = 0;
    return next;
  }

  setCurrentItem(code: string, item: QueueItem): void {
    const session = this.sessions.get(code);
    if (!session) return;
    session.currentItem = item;
  }

  updatePlaybackState(code: string, isPlaying: boolean, currentTime: number): void {
    const session = this.sessions.get(code);
    if (!session) return;
    session.isPlaying = isPlaying;
    session.currentTime = currentTime;
  }

  isHost(code: string, socketId: string): boolean {
    return this.sessions.get(code)?.hostSocketId === socketId;
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
