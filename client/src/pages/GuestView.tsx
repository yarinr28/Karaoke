import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Song, QueueItem, SessionState } from '../types';
import { fetchSongs } from '../services/api';
import { getSocket } from '../services/socket';
import { useQueue } from '../hooks/useQueue';

function fmt(s: number) {
  if (!s || !isFinite(s)) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function GuestView() {
  const { code } = useParams<{ code: string }>();
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'browse' | 'queue'>('browse');
  const { session, add, remove } = useQueue(joined ? code! : null);

  useEffect(() => {
    if (!code) return;
    const socket = getSocket();
    socket.emit('session:join', { code }, (res: { session: SessionState } | { error: string }) => {
      if ('error' in res) {
        setError(res.error);
      } else {
        setJoined(true);
        fetchSongs().then(setSongs).catch(() => {});
      }
    });
  }, [code]);

  const handleAdd = useCallback(
    (song: Song) => {
      add({
        songId: song._id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        addedBy: 'Guest',
        hasInstrumental: !!song.instrumentalFilename,
      });
      setTab('queue');
    },
    [add],
  );

  if (!joined && !error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text-dim">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎤</div>
          <p>Joining session {code}…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-center">
        <div>
          <div className="text-5xl mb-4">😕</div>
          <p className="text-white text-lg mb-2">Session not found</p>
          <p className="text-text-dim text-sm">Code: {code}</p>
          <p className="text-text-dim text-xs mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const filtered = query
    ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()))
    : songs;

  const currentItem = session?.currentItem;

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Now playing */}
      {currentItem && (
        <div className="px-4 py-3 bg-active-item border-b border-border shrink-0">
          <p className="text-[10px] text-accent-bright font-semibold uppercase tracking-wider">
            Now Playing
          </p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{currentItem.title}</p>
          {currentItem.artist && (
            <p className="text-xs text-text-dim truncate">{currentItem.artist}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {(['browse', 'queue'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'text-accent-bright border-b-2 border-accent-bright'
                : 'text-text-dim hover:text-white'
            }`}
          >
            {t === 'queue' ? `Queue (${session?.queue.length || 0})` : 'Browse'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          <div className="px-4 py-3 shrink-0">
            <input
              type="text"
              placeholder="Search songs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((song) => (
              <div
                key={song._id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-surface active:bg-active-item transition-colors"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm text-white font-medium truncate">{song.title}</span>
                  {song.artist && <span className="text-xs text-text-dim">{song.artist}</span>}
                </div>
                <span className="text-xs text-text-dim shrink-0">{fmt(song.duration)}</span>
                <button
                  onClick={() => handleAdd(song)}
                  className="w-8 h-8 rounded-full bg-accent hover:bg-accent-bright text-white text-lg flex items-center justify-center shrink-0 transition-colors"
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
          {!session?.queue.length ? (
            <div className="p-8 text-center text-text-dim text-sm">
              Queue is empty.<br />Browse songs and add them!
            </div>
          ) : (
            session.queue.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-surface"
              >
                <span className="text-text-dim text-xs w-5 shrink-0">{idx + 1}</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm text-white truncate">{item.title}</span>
                  {item.artist && <span className="text-xs text-text-dim">{item.artist}</span>}
                </div>
                <span className="text-xs text-text-dim shrink-0">{fmt(item.duration)}</span>
                {item.addedBy === 'Guest' && (
                  <button
                    onClick={() => remove(item.id)}
                    className="text-text-dim hover:text-red-400 text-sm shrink-0"
                  >
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
