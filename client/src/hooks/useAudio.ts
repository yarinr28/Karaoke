import { useRef, useCallback, useEffect } from 'react';

export interface AudioContext_ {
  analyser: AnalyserNode | null;
  resume: () => Promise<void>;
}

export function useAudioContext(audioRef: React.RefObject<HTMLAudioElement>): {
  analyser: React.MutableRefObject<AnalyserNode | null>;
  initContext: () => void;
} {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceCreated = useRef(false);

  const initContext = useCallback(() => {
    if (ctxRef.current || !audioRef.current || sourceCreated.current) return;
    sourceCreated.current = true;

    const ctx = new window.AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
  }, [audioRef]);

  // Resume context on user gesture if suspended
  useEffect(() => {
    const resume = () => ctxRef.current?.resume();
    document.addEventListener('click', resume, { once: true });
    return () => document.removeEventListener('click', resume);
  }, []);

  return { analyser: analyserRef, initContext };
}

export function useMic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;

    const ctx = new window.AudioContext();
    ctxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = 0.8;
    gainRef.current = gain;

    // Simple reverb via ConvolverNode with generated impulse response
    const convolver = ctx.createConvolver();
    convolver.buffer = createReverbBuffer(ctx, 2.5, 0.4);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.6;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.4;

    source.connect(dryGain);
    dryGain.connect(ctx.destination);

    source.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (gainRef.current) gainRef.current.gain.value = vol;
  }, []);

  return { start, stop, setVolume };
}

function createReverbBuffer(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}
