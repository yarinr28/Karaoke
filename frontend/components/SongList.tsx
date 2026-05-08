'use client';
import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/types';
import { fetchSongs, updateLyrics } from '@/lib/api';
import ProcessingStatus from './ProcessingStatus';

interface Props {
  activeSongId: string | null;
  onSelect: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onListChange?: (songs: Song[]) => void;
}

function fmt(s: number) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function SongList({ activeSongId, onSelect, onAddToQueue, onListChange }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lyricsInput, setLyricsInput] = useState('');
  const [lyricsSubmitting, setLyricsSubmitting] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchSongs().catch(() => [] as Song[]);
    setSongs(list);
    onListChange?.(list);
    setLoading(false);
  }, [onListChange]);

  useEffect(() => { load(); }, [load]);

  const handleReady = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const openLyricsEditor = (song: Song) => {
    setEditingId(song.id);
    setLyricsInput('');
  };

  const submitLyrics = async (songId: string) => {
    if (!lyricsInput.trim()) return;
    setLyricsSubmitting(true);
    try {
      const updated = await updateLyrics(songId, lyricsInput);
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingId(null);
      setLyricsInput('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update lyrics');
    } finally {
      setLyricsSubmitting(false);
    }
  };

  const filtered = query
    ? songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()))
    : songs;

  const processing = songs.filter(
    (s) => s.processing_state !== 'done' && s.processing_state !== 'error',
  );
  const ready = filtered.filter((s) => s.processing_state === 'done' || s.processing_state === 'error');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 pb-3 border-b border-border shrink-0">
        <h1
          className="text-2xl font-extrabold mb-3 bg-gradient-to-r from-purple-300 to-indigo-400 bg-clip-text text-transparent"
        >
          Karaoke
        </h1>
        <input
          type="text"
          placeholder="Search songs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Processing queue */}
        {processing.length > 0 && (
          <div className="px-3 mb-3 space-y-2">
            {processing.map((s) => (
              <ProcessingStatus key={s.id} song={s} onReady={handleReady} />
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-text-dim text-sm">Loading…</div>
        ) : ready.length === 0 ? (
          <div className="py-8 text-center text-text-dim text-sm px-4">
            {query ? 'No matches.' : 'No songs yet — upload one!'}
          </div>
        ) : (
          ready.map((song) => {
            const isActive = song.id === activeSongId;
            const isEditing = editingId === song.id;
            return (
              <div key={song.id}>
                <div
                  onClick={() => song.processing_state === 'done' && onSelect(song)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 border-l-[3px] group transition-colors ${
                    song.processing_state !== 'done'
                      ? 'opacity-50 cursor-not-allowed border-transparent'
                      : isActive
                      ? 'bg-active-bg border-accent-bright cursor-pointer'
                      : 'border-transparent hover:bg-surface cursor-pointer'
                  }`}
                >
                  <span className={`text-sm shrink-0 ${isActive ? 'animate-bounce' : ''}`}>
                    {song.processing_state === 'error' ? '⚠️' : isActive ? '🎵' : '🎤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isActive ? 'text-purple-300 font-semibold' : 'text-white'}`}>
                      {song.title}
                    </p>
                    {song.artist && <p className="text-xs text-text-dim truncate">{song.artist}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-text-dim">{fmt(song.duration)}</span>
                    {song.is_rtl && (
                      <span title="Hebrew/RTL" className="text-[10px] text-yellow-400 bg-yellow-900/30 border border-yellow-700/30 px-1 rounded">
                        RTL
                      </span>
                    )}
                    {song.processing_state === 'done' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); isEditing ? setEditingId(null) : openLyricsEditor(song); }}
                        title="Edit / sync lyrics"
                        className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors opacity-0 group-hover:opacity-100 ${
                          isEditing
                            ? 'border-accent text-accent'
                            : 'border-border text-text-dim hover:border-accent hover:text-white'
                        }`}
                      >
                        {isEditing ? 'close' : '✏️'}
                      </button>
                    )}
                    {onAddToQueue && song.processing_state === 'done' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
                        className="text-text-dim hover:text-white opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none"
                        title="Add to queue"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline lyrics editor */}
                {isEditing && (
                  <div className="mx-3 mb-2 p-3 bg-bg border border-border rounded-xl space-y-2">
                    <p className="text-[11px] text-text-dim">
                      Paste the correct lyrics. The AI will sync timestamps to your exact words and save to DB.
                    </p>
                    <textarea
                      dir="auto"
                      rows={6}
                      placeholder="Paste lyrics here…"
                      value={lyricsInput}
                      onChange={(e) => setLyricsInput(e.target.value)}
                      className="w-full rounded-lg bg-surface border border-border px-2.5 py-2 text-xs text-white placeholder-text-dim/40 resize-none focus:outline-none focus:border-accent/60 font-mono leading-relaxed"
                    />
                    <button
                      disabled={!lyricsInput.trim() || lyricsSubmitting}
                      onClick={() => submitLyrics(song.id)}
                      className="w-full py-1.5 rounded-lg bg-accent hover:bg-accent-bright disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                    >
                      {lyricsSubmitting ? 'Syncing…' : 'Sync & Save Lyrics'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
