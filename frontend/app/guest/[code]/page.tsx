'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Song, QueueItem, SessionState } from '@/types';
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ws.connected || !code || joined) return;
    ws.joinSession(code.toUpperCase());
  }, [ws.connected, code, joined, ws]);

  // Listen for join success / error
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

  if (!joined && !error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text-dim">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎤</div>
          <p>Joining {code}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {currentItem && (
        <div className="px-4 py-3 bg-active-bg border-b border-border shrink-0">
          <p className="text-[10px] text-accent-bright font-semibold uppercase tracking-wider">Now Playing</p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{currentItem.title}</p>
          {currentItem.artist && <p className="text-xs text-text-dim">{currentItem.artist}</p>}
        </div>
      )}

      <div className="flex border-b border-border shrink-0">
        {(['browse', 'queue'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize ${
              tab === t ? 'text-accent-bright border-b-2 border-accent-bright' : 'text-text-dim hover:text-white'
            }`}
          >
            {t === 'queue' ? `Queue (${queue.length})` : 'Browse'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          <div className="px-4 py-3 shrink-0">
            <input
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-surface active:bg-active-bg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{song.title}</p>
                  {song.artist && <p className="text-xs text-text-dim">{song.artist}</p>}
                </div>
                <span className="text-xs text-text-dim">{fmt(song.duration)}</span>
                <button
                  onClick={() => handleAdd(song)}
                  className="w-8 h-8 rounded-full bg-accent hover:bg-accent-bright text-white text-lg flex items-center justify-center shrink-0"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'queue' && (
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="py-8 text-center text-text-dim text-sm">Queue is empty</div>
          ) : (
            queue.map((item: QueueItem, idx: number) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <span className="text-text-dim text-xs w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title}</p>
                  {item.artist && <p className="text-xs text-text-dim">{item.artist}</p>}
                </div>
                <span className="text-xs text-text-dim">{fmt(item.duration)}</span>
                {item.added_by === 'Guest' && (
                  <button onClick={() => ws.removeFromQueue(item.id)} className="text-text-dim hover:text-red-400 text-sm">
                    ✕
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
