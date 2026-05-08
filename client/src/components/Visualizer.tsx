import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export default function Visualizer({ analyser, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = (w / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.85;
        const hue = 270 + (i / bufferLength) * 60; // purple to pink
        const alpha = 0.55 + (dataArray[i] / 255) * 0.45;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      // Fade out to silence
      const fadeOut = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
      cancelAnimationFrame(rafRef.current);
      fadeOut();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  );
}
