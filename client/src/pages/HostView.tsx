import { useState, useCallback, useEffect } from 'react';
import { Song } from '../types';
import Player from '../components/Player';
import LyricsDisplay from '../components/LyricsDisplay';
import Visualizer from '../components/Visualizer';
import SongList from '../components/SongList';
import FileUpload from '../components/FileUpload';
import Queue from '../components/Queue';
import MicInput from '../components/MicInput';
import { useQueue } from '../hooks/useQueue';
import { getSocket } from '../services/socket';

export default function HostView() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const { session, add, remove, reorder, next } = useQueue(sessionCode);

  // Create session on mount
  useEffect(() => {
    const socket = getSocket();
    socket.emit('session:create', {}, (res: { code: string }) => {
      setSessionCode(res.code);
    });
  }, []);

  const handleSongSelect = useCallback((song: Song) => {
    setCurrentSong(song);
    setCurrentTime(0);
  }, []);

  const handleAddToQueue = useCallback(
    (song: Song) => {
      if (!sessionCode) return;
      add({
        songId: song._id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        addedBy: 'Host',
        hasInstrumental: !!song.instrumentalFilename,
      });
    },
    [sessionCode, add],
  );

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (session?.queue.length) {
      const nextItem = session.queue[0];
      const nextSong = songs.find((s) => s._id === nextItem.songId);
      if (nextSong) {
        setCurrentSong(nextSong);
        next();
      }
    }
  }, [session, songs, next]);

  const handleUploaded = useCallback((song: Song) => {
    setSongs((prev) => {
      const exists = prev.find((s) => s._id === song._id);
      return exists ? prev : [song, ...prev];
    });
  }, []);

  const guestUrl = sessionCode
    ? `${window.location.origin}/guest/${sessionCode}`
    : '';

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: '260px 1fr 260px', gridTemplateRows: '1fr auto' }}>
      {/* Left sidebar: Song library */}
      <aside className="bg-sidebar border-r border-border flex flex-col overflow-hidden row-span-1">
        <SongList
          activeSongId={currentSong?._id || null}
          onSelect={handleSongSelect}
          onAddToQueue={handleAddToQueue}
          onSongsLoaded={setSongs}
        />
        <FileUpload onUploaded={handleUploaded} />
      </aside>

      {/* Center: Lyrics + Visualizer */}
      <main
        className="relative flex items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #1a0a2e 0%, #0d0d1a 70%)' }}
      >
        <Visualizer analyser={analyser} isPlaying={isPlaying} />
        <LyricsDisplay
          songId={currentSong?._id || null}
          currentTime={currentTime}
          onSeek={(t) => {
            setCurrentTime(t);
          }}
        />

        {/* Session code badge */}
        {sessionCode && (
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="flex items-center gap-2 bg-surface/80 border border-border rounded-lg px-3 py-1.5 text-xs text-text-dim hover:text-white transition-colors backdrop-blur-sm"
            >
              📱 Guest Join
              {showCode && (
                <span className="font-mono font-bold text-accent-bright ml-1">{sessionCode}</span>
              )}
            </button>
            {showCode && (
              <div className="absolute right-0 top-10 bg-sidebar border border-border rounded-xl p-4 shadow-2xl z-10 min-w-48">
                <p className="text-xs text-text-dim mb-2">Guests scan or visit:</p>
                <p className="font-mono text-2xl font-bold text-center text-accent-bright tracking-widest">
                  {sessionCode}
                </p>
                <p className="text-[10px] text-text-dim text-center mt-2 break-all">{guestUrl}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="w-full mt-2 text-xs border border-border rounded px-2 py-1 hover:border-accent transition-colors"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Right sidebar: Queue */}
      <aside className="bg-sidebar border-l border-border flex flex-col overflow-hidden row-span-1">
        <Queue
          queue={session?.queue || []}
          currentItem={session?.currentItem || null}
          onRemove={remove}
          onReorder={reorder}
          onNext={next}
        />
      </aside>

      {/* Bottom player — spans all 3 columns */}
      <div style={{ gridColumn: '1 / 4' }} className="flex items-stretch h-20 border-t border-border bg-player">
        <Player
          song={currentSong}
          onEnded={handleEnded}
          onTimeUpdate={(t) => setCurrentTime(t)}
          onPlayStateChange={setIsPlaying}
          onAnalyserReady={setAnalyser}
        />
        <div className="flex items-center px-4 shrink-0 border-l border-border">
          <MicInput />
        </div>
      </div>
    </div>
  );
}
