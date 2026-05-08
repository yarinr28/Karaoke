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

  // Create session on mount
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
    } catch {
      // ignore
    }
  }, [ws]);

  const handleUploaded = useCallback((song: Song) => {
    setAllSongs((prev) => [song, ...prev.filter((s) => s.id !== song.id)]);
  }, []);

  const guestUrl = ws.sessionCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/guest/${ws.sessionCode}`
    : '';

  return (
    <div
      className="grid h-screen"
      style={{ gridTemplateColumns: '260px 1fr 260px', gridTemplateRows: '1fr' }}
    >
      {/* Left: Song library */}
      <aside className="bg-sidebar border-r border-border flex flex-col overflow-hidden">
        <SongList
          activeSongId={currentSong?.id || null}
          onSelect={handleSelect}
          onAddToQueue={handleAddToQueue}
          onListChange={setAllSongs}
        />
        <FileUpload onUploaded={handleUploaded} />
      </aside>

      {/* Center: Player + Lyrics */}
      <main className="flex flex-col overflow-hidden relative">
        <KaraokePlayer song={currentSong} onEnded={handleEnded} />

        {/* Session code badge */}
        {ws.sessionCode && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="flex items-center gap-2 bg-surface/80 border border-border rounded-lg px-3 py-1.5 text-xs text-text-dim hover:text-white backdrop-blur-sm"
            >
              📱 Guests
              {showCode && <span className="font-mono font-bold text-accent-bright">{ws.sessionCode}</span>}
            </button>
            {showCode && (
              <div className="absolute right-0 top-10 bg-sidebar border border-border rounded-xl p-4 shadow-2xl min-w-52">
                <p className="text-xs text-text-dim mb-2">Guest link:</p>
                <p className="font-mono text-3xl font-bold text-center text-accent-bright tracking-widest mb-3">
                  {ws.sessionCode}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="w-full text-xs border border-border rounded px-2 py-1.5 hover:border-accent transition-colors"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Right: Queue */}
      <aside className="bg-sidebar border-l border-border flex flex-col overflow-hidden">
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
