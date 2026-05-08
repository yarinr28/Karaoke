import { useState, useEffect, useCallback } from 'react';
import { Song } from '../types';
import { fetchSongs, startVocalSeparation } from '../services/api';

interface Props {
  activeSongId: string | null;
  onSelect: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onSongsLoaded?: (songs: Song[]) => void;
}

export default function SongList({ activeSongId, onSelect, onAddToQueue, onSongsLoaded }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [separating, setSeparating] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const list = await fetchSongs();
      setSongs(list);
      onSongsLoaded?.(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onSongsLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSeparate = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setSeparating((prev) => new Set(prev).add(song._id));
    try {
      await startVocalSeparation(song._id);
      // Poll for completion
      const poll = setInterval(async () => {
        const list = await fetchSongs();
        const updated = list.find((s) => s._id === song._id);
        if (updated?.processingState === 'done' || updated?.processingState === 'error') {
          clearInterval(poll);
          setSeparating((prev) => { const s = new Set(prev); s.delete(song._id); return s; });
          setSongs(list);
        }
      }, 3000);
    } catch {
      setSeparating((prev) => { const s = new Set(prev); s.delete(song._id); return s; });
    }
  };

  const filtered = query
    ? songs.filter((s) =>
        `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()),
      )
    : songs;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h1
          className="text-2xl font-extrabold mb-3"
          style={{
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Karaoke
        </h1>
        <input
          type="text"
          placeholder="Search songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="p-8 text-center text-text-dim text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-dim text-sm">
            {query ? 'No songs match your search.' : 'No songs found.\nDrop audio files in songs/.'}
          </div>
        ) : (
          filtered.map((song) => {
            const isActive = song._id === activeSongId;
            const isSep = separating.has(song._id);
            const isProcessing = song.processingState === 'processing' || isSep;

            return (
              <div
                key={song._id}
                onClick={() => onSelect(song)}
                className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors border-l-[3px] group ${
                  isActive
                    ? 'bg-active-item border-accent-bright'
                    : 'border-transparent hover:bg-surface'
                }`}
              >
                <span className={`text-sm shrink-0 ${isActive ? 'animate-bounce-icon' : ''}`}>
                  {isActive ? '🎵' : '🎤'}
                </span>

                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={`text-sm truncate ${isActive ? 'text-purple-300 font-semibold' : 'text-white'}`}
                  >
                    {song.title}
                  </span>
                  {song.artist && (
                    <span className="text-xs text-text-dim truncate">{song.artist}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {song.lrcFilename && (
                    <span className="text-[10px] font-bold text-accent-bright bg-purple-900/30 border border-accent-bright/30 px-1 rounded">
                      LRC
                    </span>
                  )}

                  {song.instrumentalFilename ? (
                    <span title="Instrumental ready" className="text-xs text-emerald-400">✓</span>
                  ) : isProcessing ? (
                    <span className="text-xs text-yellow-400 animate-pulse">⏳</span>
                  ) : (
                    <button
                      onClick={(e) => handleSeparate(e, song)}
                      title="Remove vocals (AI)"
                      className="text-xs text-text-dim hover:text-accent-bright opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      🎙
                    </button>
                  )}

                  {onAddToQueue && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
                      title="Add to queue"
                      className="text-xs text-text-dim hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
