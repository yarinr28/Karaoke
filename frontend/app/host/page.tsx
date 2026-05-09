'use client';
import { useState, useCallback, useEffect } from 'react';
import { Song } from '@/types';
import KaraokePlayer from '@/components/KaraokePlayer';
import SongList from '@/components/SongList';
import FileUpload from '@/components/FileUpload';
import Queue from '@/components/Queue';
import { useQueueSocket } from '@/hooks/useWebSocket';
import { fetchSong } from '@/lib/api';

export default function HostPage() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [showCode, setShowCode] = useState(false);
  const ws = useQueueSocket();

  useEffect(() => {
    if (ws.connected && !ws.sessionCode) ws.createSession();
  }, [ws.connected, ws.sessionCode, ws.createSession]);

  const handleSelect = useCallback((song: Song) => setCurrentSong(song), []);

  const handleAddToQueue = useCallback(
    (song: Song) => {
      ws.addToQueue({
        song_id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        added_by: 'Host',
      });
    },
    [ws],
  );

  const handleEnded = useCallback(async () => {
    const nextItem = ws.session?.queue[0];
    if (!nextItem) return;
    ws.nextInQueue();
    try {
      const song = await fetchSong(nextItem.song_id);
      setCurrentSong(song);
    } catch { /* ignore */ }
  }, [ws]);

  const handleUploaded = useCallback((song: Song) => {
    setAllSongs((prev) => [song, ...prev.filter((s) => s.id !== song.id)]);
  }, []);

  const guestUrl = ws.sessionCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/guest/${ws.sessionCode}`
    : '';

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{ gridTemplateColumns: '280px 1fr 280px' }}
    >
      {/* ── Left: Song library ─────────────────────────────────── */}
      <aside className="flex flex-col overflow-hidden" style={{ background: 'rgba(5,5,12,0.96)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <SongList
          activeSongId={currentSong?.id || null}
          onSelect={handleSelect}
          onAddToQueue={handleAddToQueue}
          onListChange={setAllSongs}
        />
        <FileUpload onUploaded={handleUploaded} />
      </aside>

      {/* ── Center: Player ─────────────────────────────────────── */}
      <main className="flex flex-col overflow-hidden relative bg-player">
        <KaraokePlayer song={currentSong} onEnded={handleEnded} />

        {/* Session code badge */}
        {ws.sessionCode && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/60 hover:text-white transition-colors press-effect"
            >
              <span className="text-sm">📱</span>
              <span>Guests</span>
              {showCode && (
                <span className="font-mono font-bold tracking-widest text-accent-bright ml-1">
                  {ws.sessionCode}
                </span>
              )}
            </button>

            {showCode && (
              <div className="glass-strong absolute right-0 top-12 rounded-2xl p-5 shadow-2xl min-w-[220px] animate-scale-in">
                <p className="text-[10px] text-text-dim uppercase tracking-widest mb-2">Guest link</p>
                <p className="font-mono text-4xl font-black text-center text-accent-bright tracking-[0.15em] mb-4"
                   style={{ textShadow: '0 0 20px rgba(0,255,135,0.5)' }}>
                  {ws.sessionCode}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="w-full text-xs rounded-lg px-3 py-2 font-medium transition-colors press-effect"
                  style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.25)', color: '#00ff87' }}
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Right: Queue ───────────────────────────────────────── */}
      <aside className="flex flex-col overflow-hidden" style={{ background: 'rgba(5,5,12,0.96)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <Queue
          queue={ws.session?.queue || []}
          currentItem={ws.session?.current_item || null}
          onRemove={ws.removeFromQueue}
          onReorder={ws.reorderQueue}
          onNext={ws.nextInQueue}
        />
      </aside>
    </div>
  );
}
