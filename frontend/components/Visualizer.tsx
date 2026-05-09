'use client';
import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

function getAccentRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-rgb')
    .trim();
  const parts = raw.split(',').map((s) => parseInt(s.trim(), 10));
  if (parts.length === 3 && parts.every(isFinite)) return parts as [number, number, number];
  return [168, 85, 247]; // fallback purple
}

export default function Visualizer({ analyser, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d')!;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);

      const [r, g, b] = getAccentRgb();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barW = (w / buf.length) * 2.5;
      let x = 0;

      for (let i = 0; i < buf.length; i++) {
        const ratio = buf[i] / 255;
        const barH  = ratio * h * 0.85;
        if (barH < 1) { x += barW; continue; }

        // Gradient from bright accent at top to dim at bottom
        const grad = ctx.createLinearGradient(x, h - barH, x, h);
        grad.addColorStop(0, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 40)},${Math.min(255, b + 20)},${0.85 + ratio * 0.15})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},${0.2 + ratio * 0.3})`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, h - barH, Math.max(barW - 2, 1), barH, 2);
        ctx.fill();

        x += barW;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = c.offsetWidth  * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}
