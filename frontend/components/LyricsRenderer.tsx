'use client';
import { useRef, useEffect, useMemo, memo } from 'react';
import { LyricsLine, WordTimestamp } from '@/types';

interface Props {
  lines: LyricsLine[];
  currentTime: number;
  isRTL: boolean;
  onWordClick?: (time: number) => void;
}

interface FlatWord {
  word: WordTimestamp;
  li: number;   // line index
  wi: number;   // word index within line
}

function buildFlat(lines: LyricsLine[]): FlatWord[] {
  return lines.flatMap((line, li) =>
    line.words.map((word, wi) => ({ word, li, wi }))
  );
}

function findActiveFlat(flat: FlatWord[], t: number): number {
  let lo = 0, hi = flat.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (flat[mid].word.start <= t) { result = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return result;
}

const LyricsRenderer = memo(function LyricsRenderer({ lines, currentTime, isRTL, onWordClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLineRef  = useRef(-1);

  const flat    = useMemo(() => buildFlat(lines), [lines]);
  const flatIdx = findActiveFlat(flat, currentTime);
  const activeLi = flatIdx >= 0 ? flat[flatIdx].li : -1;
  const activeWi = flatIdx >= 0 ? flat[flatIdx].wi : -1;

  // Per-line global word offset (for past/future colouring)
  const lineOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const line of lines) { offsets.push(acc); acc += line.words.length; }
    return offsets;
  }, [lines]);

  // Scroll active line into view
  useEffect(() => {
    if (activeLi < 0 || activeLi === prevLineRef.current) return;
    prevLineRef.current = activeLi;
    const el = containerRef.current?.children[activeLi] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLi]);

  const hasWords = lines.some(l => l.words.length > 0);
  if (!hasWords) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim select-none">
        <div className="text-8xl mb-6 opacity-30">🎤</div>
        <p className="text-xl">No lyrics available yet</p>
      </div>
    );
  }

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
        const isActiveLine = li === activeLi;
        const isPastLine   = activeLi > li;
        const offset       = lineOffsets[li];

        return (
          <div
            key={li}
            className={[
              'text-center leading-relaxed mb-2 transition-all duration-300',
              isActiveLine ? 'opacity-100' : isPastLine ? 'opacity-30' : 'opacity-40',
            ].join(' ')}
            style={{ transform: isActiveLine ? 'scale(1)' : 'scale(0.88)' }}
          >
            {line.words.map((word, wi) => {
              const isActive = isActiveLine && wi === activeWi;
              const isPast   = offset + wi < flatIdx;

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
                  {word.word}
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
