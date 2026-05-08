import { useRef, useState, useEffect, useCallback } from 'react';
import { Song } from '../types';
import { getStreamUrl, getInstrumentalUrl } from '../services/api';
import { useAudioContext } from '../hooks/useAudio';

interface Props {
  song: Song | null;
  onEnded: () => void;
  onTimeUpdate: (t: number) => void;
  onAnalyserReady: (a: AnalyserNode) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function Player({ song, onEnded, onTimeUpdate, onAnalyserReady, onPlayStateChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [useInstrumental, setUseInstrumental] = useState(false);
  const prevVolume = useRef(0.8);

  const { analyser, initContext } = useAudioContext(audioRef);

  const notifiedAnalyser = useRef(false);

  // Notify parent when analyser is ready
  useEffect(() => {
    if (analyser.current && !notifiedAnalyser.current) {
      notifiedAnalyser.current = true;
      onAnalyserReady(analyser.current);
    }
  });

  // Load song
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUseInstrumental(false);

    audio.src = getStreamUrl(song._id);
    audio.load();
    audio.play().catch(() => {});
  }, [song]);

  // Apply speed
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    (audio as any).preservesPitch = true;
    (audio as any).mozPreservesPitch = true;
  }, [speed]);

  // Apply volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggleVocals = useCallback(() => {
    if (!song || !song.instrumentalFilename) return;
    const audio = audioRef.current!;
    const t = audio.currentTime;
    const wasPlaying = !audio.paused;
    const next = !useInstrumental;
    setUseInstrumental(next);
    audio.src = next ? getInstrumentalUrl(song._id) : getStreamUrl(song._id);
    audio.load();
    audio.currentTime = t;
    if (wasPlaying) audio.play().catch(() => {});
  }, [song, useInstrumental]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    initContext();
    if (audio.paused) audio.play();
    else audio.pause();
  }, [initContext]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isSeeking) return;
    setCurrentTime(audio.currentTime);
    onTimeUpdate(audio.currentTime);
  }, [isSeeking, onTimeUpdate]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }, []);

  const handleVolume = (v: number) => {
    setVolume(v);
    if (v > 0) prevVolume.current = v;
  };

  const toggleMute = () => {
    if (volume > 0) {
      prevVolume.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolume.current);
    }
  };

  const volIcon = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';

  return (
    <>
      <audio
        ref={audioRef}
        onPlay={() => { setIsPlaying(true); onPlayStateChange?.(true); }}
        onPause={() => { setIsPlaying(false); onPlayStateChange?.(false); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onEnded}
        onClick={initContext}
      />

      <footer className="flex flex-1 items-center gap-4 px-5 py-0 bg-player border-t border-border h-20 shrink-0 min-w-0">
        {/* Song info */}
        <div className="w-48 min-w-0 flex flex-col gap-0.5 shrink-0">
          <span className="text-sm font-semibold truncate text-white">
            {song?.title || 'No song selected'}
          </span>
          <span className="text-xs text-text-dim truncate">{song?.artist}</span>
          {useInstrumental && (
            <span className="text-xs text-accent-bright">♪ Instrumental</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={togglePlay}
            disabled={!song}
            className="w-11 h-11 rounded-full bg-accent hover:bg-accent-bright disabled:opacity-25 text-white flex items-center justify-center transition-colors text-base"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-text-dim tabular-nums w-8 shrink-0">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-text-dim tabular-nums w-8 shrink-0 text-right">{fmt(duration)}</span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-dim">Speed</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-surface border border-border rounded text-xs text-white px-1 py-0.5 outline-none cursor-pointer"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </div>

        {/* Vocal toggle */}
        {song?.instrumentalFilename && (
          <button
            onClick={toggleVocals}
            title={useInstrumental ? 'Switch to original' : 'Remove vocals'}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors shrink-0 ${
              useInstrumental
                ? 'bg-accent border-accent-bright text-white'
                : 'border-border text-text-dim hover:border-accent hover:text-white'
            }`}
          >
            🎙 {useInstrumental ? 'Original' : 'No Vocals'}
          </button>
        )}

        {/* Volume */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleMute} className="text-base cursor-pointer select-none">
            {volIcon}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => handleVolume(parseFloat(e.target.value))}
            className="w-20"
          />
        </div>
      </footer>
    </>
  );
}
