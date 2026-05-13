'use client';
import { useState, useCallback, useEffect } from 'react';
import { Song } from '@/types';
import KaraokePlayer from '@/components/KaraokePlayer';
import SongList from '@/components/SongList';
import FileUpload from '@/components/FileUpload';
import Queue from '@/components/Queue';
import ThemeModal from '@/components/ThemeModal';
import { useQueueSocket } from '@/hooks/useWebSocket';
import { fetchSong } from '@/lib/api';

export default function HostPage() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [lastUploaded, setLastUploaded] = useState<Song | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const ws = useQueueSocket();

  useEffect(() => {
    if (!ws.connected || ws.sessionCode) return;
    const saved = localStorage.getItem('karaoke:session');
    if (saved) {
      ws.joinSession(saved);
    } else {
      ws.createSession();
    }
  }, [ws.connected, ws.sessionCode, ws.createSession, ws.joinSession]);

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
    setLastUploaded(song);
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
      <aside className="flex flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-border)' }}>
        <SongList
          activeSongId={currentSong?.id || null}
          onSelect={handleSelect}
          onAddToQueue={handleAddToQueue}
          onListChange={setAllSongs}
          uploadedSong={lastUploaded}
        />
        <FileUpload onUploaded={handleUploaded} />
      </aside>

      {/* ── Center: Player ─────────────────────────────────────── */}
      <main className="flex flex-col overflow-hidden relative bg-player">
        <KaraokePlayer song={currentSong} onEnded={handleEnded} />

        {/* Theme button */}
        <button
          onClick={() => setShowTheme(true)}
          className="absolute top-4 left-4 z-20 glass flex items-center justify-center w-9 h-9 rounded-xl press-effect transition-colors"
          title="Appearance"
          style={{ color: 'var(--color-text-dim)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-dim)')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </button>

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
                <p className="font-mono text-4xl font-black text-center tracking-[0.15em] mb-4"
                   style={{ color: 'var(--accent)', textShadow: '0 0 20px rgba(var(--accent-rgb), 0.5)' }}>
                  {ws.sessionCode}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="w-full text-xs rounded-lg px-3 py-2 font-medium transition-colors press-effect"
                  style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.25)', color: 'var(--accent)' }}
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}

      {/* ── Right: Queue ───────────────────────────────────────── */}
      <aside className="flex flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)', borderLeft: '1px solid var(--color-border)' }}>
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
