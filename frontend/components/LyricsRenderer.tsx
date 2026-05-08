'use client';
import { useRef, useEffect, memo } from 'react';
import { WordTimestamp } from '@/types';

interface Props {
  words: WordTimestamp[];
  currentTime: number;
  isRTL: boolean;
  onWordClick?: (time: number) => void;
}

function findActiveIndex(words: WordTimestamp[], t: number): number {
  let lo = 0, hi = words.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= t) { result = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return result;
}

// Group words into visual lines (~8 words each)
function groupIntoLines(words: WordTimestamp[], lineSize = 8): WordTimestamp[][] {
  const lines: WordTimestamp[][] = [];
  for (let i = 0; i < words.length; i += lineSize) {
    lines.push(words.slice(i, i + lineSize));
  }
  return lines;
}

const LyricsRenderer = memo(function LyricsRenderer({ words, currentTime, isRTL, onWordClick }: Props) {
  const activeIdx = findActiveIndex(words, currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLineRef = useRef(-1);

  const lines = groupIntoLines(words);

  // Find which line is active
  let activeLine = -1;
  if (activeIdx >= 0) activeLine = Math.floor(activeIdx / 8);

  // Scroll active line into view
  useEffect(() => {
    if (activeLine === prevLineRef.current || activeLine < 0) return;
    prevLineRef.current = activeLine;
    const el = containerRef.current?.children[activeLine] as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLine]);

  if (!words.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim select-none">
        <div className="text-8xl mb-6 opacity-30">🎤</div>
        <p className="text-xl">No lyrics available yet</p>
      </div>
    );
  }

  let wordIdx = 0;
  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto px-12"
      style={{
        paddingTop: '40vh',
        paddingBottom: '40vh',
        scrollbarWidth: 'none',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {lines.map((line, li) => {
        const lineStart = wordIdx;
        wordIdx += line.length;
        const isActiveLine = li === activeLine;
        const isPastLine = activeLine > li;

        return (
          <div
            key={li}
            className={[
              'text-center leading-relaxed mb-2 transition-all duration-300',
              isActiveLine ? 'opacity-100' : isPastLine ? 'opacity-30 scale-90' : 'opacity-40 scale-90',
            ].join(' ')}
            style={{ transform: isActiveLine ? 'scale(1)' : 'scale(0.88)' }}
          >
            {line.map((word, wi) => {
              const globalIdx = lineStart + wi;
              const isActive = globalIdx === activeIdx;
              const isPast = globalIdx < activeIdx;

              return (
                <span
                  key={wi}
                  onClick={() => onWordClick?.(word.start)}
                  className={[
                    'cursor-pointer transition-colors duration-75 mx-0.5',
                    isActiveLine
                      ? isActive
                        ? 'text-accent-bright font-bold text-4xl animate-glow'
                        : isPast
                        ? 'text-white text-3xl font-semibold'
                        : 'text-white/60 text-3xl'
                      : 'text-text-dim text-2xl',
                  ].join(' ')}
                  style={isActive ? { textShadow: '0 0 20px rgba(168,85,247,0.9), 0 0 40px rgba(168,85,247,0.5)' } : undefined}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

export default LyricsRenderer;
