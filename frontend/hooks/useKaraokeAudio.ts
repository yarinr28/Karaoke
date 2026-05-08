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
  const instRef = useRef<HTMLAudioElement | null>(null);
  const vocalsRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const vocalsGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const ctxInitialized = useRef(false);

  const [state, setState] = useState<KaraokeAudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    karaokeMode: false,
    speed: 1,
  });

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // rAF loop for smooth time tracking
  useEffect(() => {
    const tick = () => {
      const inst = instRef.current;
      if (inst && !inst.paused) {
        setState((prev) => ({ ...prev, currentTime: inst.currentTime }));
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

    const instSource = ctx.createMediaElementSource(instRef.current);
    const vocalSource = ctx.createMediaElementSource(vocalsRef.current);

    const vocalGain = ctx.createGain();
    vocalGain.gain.value = 0; // default: karaoke mode OFF means vocals ON... wait
    // Actually default is normal mode (vocals audible)
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

  // Load song into both audio elements
  const loadSong = useCallback((s: Song) => {
    if (!instRef.current || !vocalsRef.current) return;
    ctxInitialized.current = false;
    ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    setAnalyser(null);

    const hasDual = !!s.instrumental_filename && !!s.vocals_filename;

    if (hasDual) {
      instRef.current.src = getInstrumentalUrl(s);
      vocalsRef.current.src = getVocalsUrl(s);
    } else {
      // Not yet processed — play original on instrumental track, silence vocals
      instRef.current.src = getOriginalUrl(s);
      vocalsRef.current.src = '';
    }

    instRef.current.load();
    if (hasDual) vocalsRef.current.load();

    setState((prev) => ({
      ...prev,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      karaokeMode: false,
    }));
  }, []);

  const play = useCallback(async () => {
    const inst = instRef.current;
    const vocals = vocalsRef.current;
    if (!inst) return;

    initAudioContext();
    await ctxRef.current?.resume();

    // Keep vocals in sync
    if (vocals && vocals.src) {
      vocals.currentTime = inst.currentTime;
      vocals.playbackRate = inst.playbackRate;
    }

    await inst.play();
    if (vocals && vocals.src) vocals.play().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [initAudioContext]);

  const pause = useCallback(() => {
    instRef.current?.pause();
    vocalsRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (instRef.current) instRef.current.currentTime = time;
    if (vocalsRef.current && vocalsRef.current.src) {
      vocalsRef.current.currentTime = time;
    }
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (instRef.current) {
      instRef.current.playbackRate = speed;
      (instRef.current as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
    if (vocalsRef.current) {
      vocalsRef.current.playbackRate = speed;
    }
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const toggleKaraokeMode = useCallback(() => {
    setState((prev) => {
      const next = !prev.karaokeMode;
      if (vocalsGainRef.current) {
        vocalsGainRef.current.gain.value = next ? 0 : 1;
      }
      return { ...prev, karaokeMode: next };
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (instRef.current) instRef.current.volume = vol;
    if (vocalsRef.current) vocalsRef.current.volume = vol;
  }, []);

  const onInstrumentalLoaded = useCallback(() => {
    setState((prev) => ({
      ...prev,
      duration: instRef.current?.duration || 0,
    }));
  }, []);

  const onEnded = useCallback(() => {
    vocalsRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  return {
    instRef,
    vocalsRef,
    state,
    analyser,
    play,
    pause,
    togglePlay,
    seek,
    setSpeed,
    toggleKaraokeMode,
    setVolume,
    loadSong,
    onInstrumentalLoaded,
    onEnded,
  };
}
