'use client';
import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export default function Visualizer({ analyser, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d')!;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barW = (w / buf.length) * 2.5;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const barH = (buf[i] / 255) * h * 0.85;
        const hue = 265 + (i / buf.length) * 65;
        ctx.fillStyle = `hsla(${hue},78%,60%,${0.5 + (buf[i] / 255) * 0.5})`;
        ctx.fillRect(x, h - barH, barW - 1, barH);
        x += barW;
      }
    };

    if (isPlaying) draw();
    else { cancelAnimationFrame(rafRef.current); ctx.clearRect(0, 0, canvas.width, canvas.height); }

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = c.offsetWidth * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
    />
  );
}
