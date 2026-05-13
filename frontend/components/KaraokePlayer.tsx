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

function VolumeIcon({ vol }: { vol: number }) {
  if (vol === 0) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  );
  if (vol < 0.5) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}

export default function KaraokePlayer({ song, onEnded }: Props) {
  const audio = useKaraokeAudio(song);
  const { state, analyser, instRef, vocalsRef, seek, setSpeed, togglePlay, toggleKaraokeMode, setVolume, loadSong, onInstrumentalLoaded, onEnded: handleEnded } = audio;

  const [vol, setVol] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return parseFloat(localStorage.getItem('karaoke:volume') ?? '1');
  });

  useEffect(() => { localStorage.setItem('karaoke:volume', String(vol)); }, [vol]);
  useEffect(() => { setVolume(vol); }, []); // apply saved volume on mount
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
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={instRef} onLoadedMetadata={onInstrumentalLoaded} onEnded={handleEnded_} crossOrigin="anonymous" />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={vocalsRef} crossOrigin="anonymous" />

      {/* Lyrics / ambient area */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background: state.isPlaying
            ? 'radial-gradient(ellipse 90% 70% at 50% 40%, var(--player-bg1) 0%, var(--player-bg2) 55%, var(--color-bg) 100%)'
            : 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--player-bg2) 0%, var(--color-bg) 70%)',
          transition: 'background 1.5s ease',
        }}
      >
        <Visualizer analyser={analyser} isPlaying={state.isPlaying} />

        {!song ? (
          <div className="flex flex-col items-center justify-center h-full select-none pointer-events-none">
            <div className="text-7xl mb-5 opacity-20" style={{ filter: 'grayscale(1)' }}>🎤</div>
            <p className="text-base" style={{ color: 'var(--color-text-dim)' }}>Select a song to start singing</p>
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

      {/* ── Footer shell ──────────────────────────────────────────── */}
      <footer
        className="shrink-0"
        style={{
          background: 'var(--color-footer)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {/* Row 1: seek bar + times */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-1">
          <span className="text-[11px] text-text-dim tabular-nums w-8 shrink-0">{fmt(state.currentTime)}</span>
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
          <span className="text-[11px] text-text-dim tabular-nums w-8 shrink-0 text-right">{fmt(state.duration)}</span>
        </div>

        {/* Row 2: controls */}
        <div className="flex items-center gap-4 px-5 py-3">
          {/* Song info */}
          <div className="w-36 min-w-0 shrink-0">
            <p dir="auto" className="text-sm font-semibold text-white truncate leading-tight" style={{ unicodeBidi: 'plaintext' }}>{song?.title || 'No song'}</p>
            <p dir="auto" className="text-[11px] text-text-dim truncate" style={{ unicodeBidi: 'plaintext' }}>{song?.artist}</p>
          </div>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            disabled={!song}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 press-effect disabled:opacity-30 transition-all"
            style={song ? {
              background: state.isPlaying
                ? 'rgba(var(--accent-rgb), 0.15)'
                : 'rgba(var(--accent-rgb), 0.9)',
              boxShadow: state.isPlaying
                ? '0 0 0 1px rgba(var(--accent-rgb), 0.4), 0 0 24px rgba(var(--accent-rgb), 0.25)'
                : '0 0 0 1px rgba(var(--accent-rgb), 0.6), 0 0 32px rgba(var(--accent-rgb), 0.5)',
              color: state.isPlaying ? 'var(--accent)' : '#ffffff',
            } : { background: 'var(--color-surface)', color: 'var(--color-text-dim)' }}
          >
            {state.isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>

          {/* Karaoke mode */}
          <button
            onClick={toggleKaraokeMode}
            disabled={!song?.instrumental_filename}
            title={song?.instrumental_filename ? 'Toggle karaoke mode' : 'Process song first'}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all press-effect shrink-0 disabled:opacity-30"
            style={state.karaokeMode ? {
              background: 'rgba(var(--accent-rgb), 0.12)',
              border: '1px solid rgba(var(--accent-rgb), 0.4)',
              color: 'var(--accent)',
              boxShadow: '0 0 16px rgba(var(--accent-rgb), 0.2)',
            } : {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
            }}
          >
            🎙 Karaoke
          </button>

          {/* Speed */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-text-dim">Speed</span>
            <select
              value={state.speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="rounded-md text-xs text-white px-1.5 py-1 outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              {[0.75, 1, 1.25, 1.5].map((s) => (
                <option key={s} value={s} style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{s}x</option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => { const v = vol > 0 ? 0 : 1; setVol(v); setVolume(v); }}
              className="text-text-dim hover:text-white transition-colors"
            >
              <VolumeIcon vol={vol} />
            </button>
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
        </div>
      </footer>
    </div>
  );
}
