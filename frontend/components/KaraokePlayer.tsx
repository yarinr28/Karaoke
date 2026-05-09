'use client';
import { useEffect, useCallback, useState } from 'react';
import { Song } from '@/types';
import { useKaraokeAudio } from '@/hooks/useKaraokeAudio';
import Visualizer from './Visualizer';
import LyricsRenderer from './LyricsRenderer';

interface Props {
  song: Song | null;
  onEnded: () => void;
  onSessionCode?: string;
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function KaraokePlayer({ song, onEnded }: Props) {
  const audio = useKaraokeAudio(song);
  const { state, analyser, instRef, vocalsRef, seek, setSpeed, togglePlay, toggleKaraokeMode, setVolume, loadSong, onInstrumentalLoaded, onEnded: handleEnded } = audio;

  const [vol, setVol] = useState(1);
  const seekPct = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const volPct  = vol * 100;

  useEffect(() => {
    if (!song) return;
    loadSong(song);
  }, [song, loadSong]);

  const handleEnded_ = useCallback(() => {
    handleEnded();
    onEnded();
  }, [handleEnded, onEnded]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft') seek(Math.max(0, state.currentTime - 5));
      if (e.code === 'ArrowRight') seek(Math.min(state.duration, state.currentTime + 5));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seek, state.currentTime, state.duration]);

  const lines = song?.lyrics?.lines ?? [];
  const isRTL = song?.is_rtl || false;

  return (
    <div className="flex flex-col h-full">
      {/* Hidden audio elements */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={instRef}
        onLoadedMetadata={onInstrumentalLoaded}
        onEnded={handleEnded_}
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={vocalsRef} crossOrigin="anonymous" />

      {/* Lyrics area with visualizer */}
      <div className="relative flex-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #1a0a2e 0%, #0d0d1a 70%)' }}>
        <Visualizer analyser={analyser} isPlaying={state.isPlaying} />
        {!song ? (
          <div className="flex flex-col items-center justify-center h-full text-text-dim select-none">
            <div className="text-8xl mb-6 opacity-30">🎤</div>
            <p className="text-xl">Select a song to start singing</p>
          </div>
        ) : (
          <LyricsRenderer
            lines={lines}
            currentTime={state.currentTime}
            isRTL={isRTL}
            onWordClick={seek}
          />
        )}
      </div>

      {/* Player bar */}
      <footer className="flex items-center gap-4 px-5 h-20 bg-player border-t border-border shrink-0">
        {/* Song info */}
        <div className="w-44 min-w-0 shrink-0 flex flex-col">
          <span className="text-sm font-semibold text-white truncate">{song?.title || 'No song'}</span>
          <span className="text-xs text-text-dim truncate">{song?.artist}</span>
          {song?.language && (
            <span className="text-[10px] text-text-dim opacity-60">{song.language.toUpperCase()}</span>
          )}
        </div>

        {/* Play */}
        <button
          onClick={togglePlay}
          disabled={!song}
          className="w-11 h-11 rounded-full bg-accent hover:bg-accent-bright disabled:opacity-30 text-white flex items-center justify-center shrink-0 transition-colors"
        >
          {state.isPlaying ? '⏸' : '▶'}
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-text-dim tabular-nums w-9 shrink-0">{fmt(state.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={state.duration || 1}
            step={0.1}
            value={state.currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="seek-bar flex-1"
            style={{ '--fill': `${seekPct}%` } as React.CSSProperties}
          />
          <span className="text-xs text-text-dim tabular-nums w-9 shrink-0 text-right">{fmt(state.duration)}</span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-text-dim">Speed</span>
          <select
            value={state.speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-surface border border-border rounded text-xs text-white px-1 py-0.5 outline-none"
          >
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </div>

        {/* Karaoke mode */}
        <button
          onClick={toggleKaraokeMode}
          disabled={!song?.instrumental_filename}
          title={song?.instrumental_filename ? 'Toggle karaoke mode' : 'Process song first'}
          className={`px-3 py-1 rounded text-xs font-medium border transition-colors shrink-0 disabled:opacity-30 ${
            state.karaokeMode
              ? 'bg-accent border-accent-bright text-white'
              : 'border-border text-text-dim hover:border-accent hover:text-white'
          }`}
        >
          🎙 {state.karaokeMode ? 'Karaoke ON' : 'Karaoke'}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm">{vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={vol}
            onChange={(e) => { const v = parseFloat(e.target.value); setVol(v); setVolume(v); }}
            className="volume-bar w-20"
            style={{ '--fill': `${volPct}%` } as React.CSSProperties}
          />
        </div>
      </footer>
    </div>
  );
}
