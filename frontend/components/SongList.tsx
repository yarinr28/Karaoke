'use client';
import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/types';
import { fetchSongs } from '@/lib/api';
import ProcessingStatus from './ProcessingStatus';
import EditSongModal from './EditSongModal';

interface Props {
  activeSongId: string | null;
  onSelect: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onListChange?: (songs: Song[]) => void;
  uploadedSong?: Song | null;
}

function fmt(s: number) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function SongList({ activeSongId, onSelect, onAddToQueue, onListChange, uploadedSong }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModalSong, setEditModalSong] = useState<Song | null>(null);

  const load = useCallback(async () => {
    const list = await fetchSongs().catch(() => [] as Song[]);
    setSongs(list);
    onListChange?.(list);
    setLoading(false);
  }, [onListChange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!uploadedSong) return;
    setSongs((prev) => [uploadedSong, ...prev.filter((s) => s.id !== uploadedSong.id)]);
  }, [uploadedSong]);

  const handleReady = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleSongUpdated = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditModalSong(null);
  }, []);

  const filtered = query
    ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()))
    : songs;

  const processing = songs.filter(
    (s) => s.processing_state !== 'done' && s.processing_state !== 'error',
  );
  const ready = filtered.filter((s) => s.processing_state === 'done' || s.processing_state === 'error');

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h1 className="text-xl font-black mb-4 tracking-tight" style={{ color: 'var(--accent)', textShadow: '0 0 20px rgba(var(--accent-rgb),0.4)' }}>
            Karaoke
          </h1>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search songs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white placeholder:text-text-dim outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {processing.length > 0 && (
            <div className="px-3 mb-3 space-y-2">
              {processing.map((s) => (
                <ProcessingStatus key={s.id} song={s} onReady={handleReady} />
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-text-dim text-sm">Loading…</div>
          ) : ready.length === 0 ? (
            <div className="py-10 text-center text-text-dim text-sm px-4">
              {query ? 'No matches.' : 'No songs yet — upload one!'}
            </div>
          ) : (
            ready.map((song) => {
              const isActive = song.id === activeSongId;
              const canPlay  = song.processing_state === 'done';
              return (
                <div
                  key={song.id}
                  onClick={() => canPlay && onSelect(song)}
                  className="flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-xl group transition-all duration-200"
                  style={
                    isActive
                      ? {
                          background: 'rgba(var(--accent-rgb),0.08)',
                          boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),0.2)',
                          cursor: 'pointer',
                        }
                      : canPlay
                      ? { cursor: 'pointer' }
                      : { opacity: 0.45, cursor: 'not-allowed' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive && canPlay)
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = '';
                  }}
                >
                  {/* Active indicator bar */}
                  <div
                    className="w-0.5 h-8 rounded-full shrink-0 transition-all duration-300"
                    style={isActive ? { background: 'var(--accent)', boxShadow: '0 0 8px rgba(var(--accent-rgb),0.7)' } : { background: 'transparent' }}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      dir="auto"
                      className="text-sm truncate font-medium leading-tight"
                      style={{ color: isActive ? 'var(--accent)' : 'var(--color-text)', unicodeBidi: 'plaintext' }}
                    >
                      {song.title}
                    </p>
                    {song.artist && (
                      <p dir="auto" className="text-[11px] text-text-dim truncate mt-0.5" style={{ unicodeBidi: 'plaintext' }}>{song.artist}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {song.is_rtl && (
                      <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: 'rgba(234,179,8,0.8)' }}>
                        RTL
                      </span>
                    )}
                    <span className="text-[11px] text-text-dim tabular-nums">{fmt(song.duration)}</span>

                    {canPlay && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditModalSong(song); }}
                        title="Edit song"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-text-dim hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}

                    {onAddToQueue && canPlay && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
                        title="Add to queue"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-text-dim hover-accent"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editModalSong && (
        <EditSongModal
          song={editModalSong}
          onClose={() => setEditModalSong(null)}
          onSaved={handleSongUpdated}
        />
      )}
    </>
  );
}
