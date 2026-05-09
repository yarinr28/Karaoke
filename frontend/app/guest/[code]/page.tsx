'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Song, QueueItem } from '@/types';
import { fetchSongs } from '@/lib/api';
import { useQueueSocket } from '@/hooks/useWebSocket';

function fmt(s: number) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function GuestPage() {
  const { code } = useParams<{ code: string }>();
  const ws = useQueueSocket();
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'browse' | 'queue'>('browse');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!ws.connected || !code || joined) return;
    ws.joinSession(code.toUpperCase());
  }, [ws.connected, code, joined, ws]);

  useEffect(() => {
    if (ws.sessionCode === code?.toUpperCase()) {
      setJoined(true);
      fetchSongs().then((list) => setSongs(list.filter((s) => s.processing_state === 'done')));
    }
  }, [ws.sessionCode, code]);

  const handleAdd = useCallback(
    (song: Song) => {
      ws.addToQueue({
        song_id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        added_by: 'Guest',
      });
      setTab('queue');
    },
    [ws],
  );

  const filtered = query
    ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()))
    : songs;

  const queue = ws.session?.queue || [];
  const currentItem = ws.session?.current_item;

  if (!joined) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--player-bg2) 0%, var(--color-bg) 70%)' }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-40">🎤</div>
          <p className="text-text-dim text-sm">Joining {code}…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Now playing banner */}
      {currentItem && (
        <div
          className="px-4 py-3 shrink-0"
          style={{
            background: 'rgba(var(--accent-rgb),0.05)',
            borderBottom: '1px solid rgba(var(--accent-rgb),0.12)',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
            style={{ color: 'var(--accent)', textShadow: '0 0 10px rgba(var(--accent-rgb),0.4)' }}
          >
            ♪ Now Playing
          </p>
          <p dir="auto" className="text-sm font-semibold text-white truncate" style={{ unicodeBidi: 'plaintext' }}>{currentItem.title}</p>
          {currentItem.artist && <p dir="auto" className="text-[11px] text-text-dim" style={{ unicodeBidi: 'plaintext' }}>{currentItem.artist}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {(['browse', 'queue'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-sm font-medium capitalize transition-colors"
            style={{
              color: tab === t ? 'var(--accent)' : 'var(--color-text-dim)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {t === 'queue' ? `Queue${queue.length > 0 ? ` (${queue.length})` : ''}` : 'Browse'}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {tab === 'browse' && (
        <>
          <div className="px-4 py-3 shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search songs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-text-dim"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-text-dim text-sm">No songs found.</div>
            )}
            {filtered.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p dir="auto" className="text-sm font-medium text-white truncate" style={{ unicodeBidi: 'plaintext' }}>{song.title}</p>
                  {song.artist && <p dir="auto" className="text-[11px] text-text-dim mt-0.5" style={{ unicodeBidi: 'plaintext' }}>{song.artist}</p>}
                </div>
                <span className="text-[11px] text-text-dim tabular-nums shrink-0">{fmt(song.duration)}</span>
                <button
                  onClick={() => handleAdd(song)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 press-effect transition-all"
                  style={{
                    background: 'rgba(var(--accent-rgb),0.15)',
                    border: '1px solid rgba(var(--accent-rgb),0.3)',
                    color: 'var(--accent)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Queue tab */}
      {tab === 'queue' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-text-dim text-sm">Queue is empty</div>
          ) : (
            queue.map((item: QueueItem, idx: number) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-[11px] text-text-dim tabular-nums w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p dir="auto" className="text-sm font-medium text-white truncate" style={{ unicodeBidi: 'plaintext' }}>{item.title}</p>
                  {item.artist && <p dir="auto" className="text-[11px] text-text-dim mt-0.5" style={{ unicodeBidi: 'plaintext' }}>{item.artist}</p>}
                </div>
                <span className="text-[11px] text-text-dim tabular-nums shrink-0">{fmt(item.duration)}</span>
                {item.added_by === 'Guest' && (
                  <button
                    onClick={() => ws.removeFromQueue(item.id)}
                    className="p-1.5 rounded-lg text-text-dim hover:text-red-400 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
