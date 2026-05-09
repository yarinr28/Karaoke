'use client';
import { useRef, useCallback, useState, useEffect } from 'react';
import { Song } from '@/types';
import { getOriginalUrl, getInstrumentalUrl, getVocalsUrl } from '@/lib/api';

export interface KaraokeAudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  karaokeMode: boolean;
  speed: number;
}

export function useKaraokeAudio(song: Song | null) {
  const instRef        = useRef<HTMLAudioElement | null>(null);
  const vocalsRef      = useRef<HTMLAudioElement | null>(null);
  const ctxRef         = useRef<AudioContext | null>(null);
  const vocalsGainRef  = useRef<GainNode | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const rafRef         = useRef<number>(0);
  const ctxInitialized = useRef(false);
  // Prevent re-loading audio when parent re-renders with the same song object
  const loadedSongIdRef = useRef<string | null>(null);
  // Whether the current song has separate instrumental + vocals stems
  const hasDualRef      = useRef(false);
  // Pending seeked-listener cleanup (handles rapid drag on seek bar)
  const pendingSeekRef  = useRef<(() => void) | null>(null);

  const [state, setState] = useState<KaraokeAudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    karaokeMode: false,
    speed: 1,
  });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // rAF — tracks currentTime only when playing.
  // While paused (including during a seek), state.currentTime is set
  // directly by seek() so the lyrics snap immediately without rAF interference.
  useEffect(() => {
    const tick = () => {
      const inst = instRef.current;
      if (inst && !inst.paused && !inst.seeking) {
        const t = inst.currentTime;
        setState((prev) =>
          Math.abs(prev.currentTime - t) < 0.016 ? prev : { ...prev, currentTime: t }
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const initAudioContext = useCallback(() => {
    if (ctxInitialized.current || !instRef.current || !vocalsRef.current) return;
    ctxInitialized.current = true;

    const ctx = new window.AudioContext();
    ctxRef.current = ctx;

    const instSource  = ctx.createMediaElementSource(instRef.current);
    const vocalSource = ctx.createMediaElementSource(vocalsRef.current);

    const vocalGain = ctx.createGain();
    vocalGain.gain.value = 1;
    vocalsGainRef.current = vocalGain;

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
    analyserRef.current = analyserNode;

    instSource.connect(analyserNode);
    vocalSource.connect(vocalGain);
    vocalGain.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    setAnalyser(analyserNode);
  }, []);

  const loadSong = useCallback((s: Song) => {
    if (!instRef.current || !vocalsRef.current) return;
    // Same song already loaded — don't reset playback position
    if (loadedSongIdRef.current === s.id) return;
    loadedSongIdRef.current = s.id;

    ctxInitialized.current = false;
    ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    setAnalyser(null);

    const hasDual = !!s.instrumental_filename && !!s.vocals_filename;
    hasDualRef.current = hasDual;

    instRef.current.src = hasDual ? getInstrumentalUrl(s) : getOriginalUrl(s);
    instRef.current.load();

    if (hasDual) {
      vocalsRef.current.src = getVocalsUrl(s);
      vocalsRef.current.load();
    } else {
      // removeAttribute + load() fully resets the element to HAVE_NOTHING state.
      // Setting src='' does NOT clear the source — browsers resolve it as the
      // current page URL, which causes the AudioContext to receive HTML data.
      vocalsRef.current.removeAttribute('src');
      vocalsRef.current.load();
    }

    setState({ isPlaying: false, currentTime: 0, duration: 0, karaokeMode: false, speed: 1 });
  }, []);

  const pause = useCallback(() => {
    instRef.current?.pause();
    vocalsRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const play = useCallback(async () => {
    const inst   = instRef.current;
    const vocals = vocalsRef.current;
    if (!inst) return;

    initAudioContext();
    await ctxRef.current?.resume();

    // Sync vocals to the exact current position before resuming
    if (hasDualRef.current && vocals) {
      vocals.currentTime  = inst.currentTime;
      vocals.playbackRate = inst.playbackRate;
    }

    try {
      await inst.play();
    } catch {
      return;
    }
    if (hasDualRef.current && vocals) vocals.play().catch(() => {});

    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [initAudioContext]);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause(); else play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const inst   = instRef.current;
    const vocals = vocalsRef.current;
    if (!inst) return;

    const wasPlaying = !inst.paused;

    // ── 1. Pause both tracks immediately ─────────────────────────────────────
    inst.pause();
    if (hasDualRef.current && vocals) vocals.pause();

    // ── 2. Update UI state right away so lyrics snap + slider stays put ──────
    setState((prev) => ({ ...prev, currentTime: time, isPlaying: false }));

    // ── 3. Apply the seek to both elements ───────────────────────────────────
    inst.currentTime = time;
    if (hasDualRef.current && vocals) vocals.currentTime = time;

    // ── 4. If we were playing, resume after the browser confirms the seek ────
    if (wasPlaying) {
      // Remove any leftover listener from a previous rapid drag
      if (pendingSeekRef.current) {
        inst.removeEventListener('seeked', pendingSeekRef.current);
        pendingSeekRef.current = null;
      }

      const onSeeked = () => {
        inst.removeEventListener('seeked', onSeeked);
        pendingSeekRef.current = null;

        inst.play().then(() => {
          if (vocals?.src) {
            // Re-sync vocals after seek is confirmed complete
            vocals.currentTime = inst.currentTime;
            vocals.play().catch(() => {});
          }
          setState((prev) => ({ ...prev, isPlaying: true }));
        }).catch(() => {});
      };

      pendingSeekRef.current = onSeeked;
      inst.addEventListener('seeked', onSeeked);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (instRef.current) {
      instRef.current.playbackRate = speed;
      (instRef.current as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
    if (vocalsRef.current) vocalsRef.current.playbackRate = speed;
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const toggleKaraokeMode = useCallback(() => {
    setState((prev) => {
      const next = !prev.karaokeMode;
      if (vocalsGainRef.current) vocalsGainRef.current.gain.value = next ? 0 : 1;
      return { ...prev, karaokeMode: next };
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (instRef.current) instRef.current.volume = vol;
    if (vocalsRef.current) vocalsRef.current.volume = vol;
  }, []);

  const onInstrumentalLoaded = useCallback(() => {
    setState((prev) => ({ ...prev, duration: instRef.current?.duration || 0 }));
  }, []);

  const onEnded = useCallback(() => {
    vocalsRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  return {
    instRef, vocalsRef, state, analyser,
    play, pause, togglePlay, seek, setSpeed,
    toggleKaraokeMode, setVolume, loadSong,
    onInstrumentalLoaded, onEnded,
  };
}
