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
  li: number;
  wi: number;
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

  const lineOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const line of lines) { offsets.push(acc); acc += line.words.length; }
    return offsets;
  }, [lines]);

  useEffect(() => {
    if (activeLi < 0 || activeLi === prevLineRef.current) return;
    prevLineRef.current = activeLi;
    const el = containerRef.current?.children[activeLi] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLi]);

  const hasWords = lines.some(l => l.words.length > 0);
  if (!hasWords) {
    return (
      <div className="flex flex-col items-center justify-center h-full select-none">
        <div className="text-7xl mb-5 opacity-20" style={{ filter: 'grayscale(1)' }}>🎤</div>
        <p className="text-base text-text-dim">No lyrics available yet</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full h-full overflow-y-auto"
      style={{
        paddingTop: '38vh',
        paddingBottom: '38vh',
        paddingLeft: '2rem',
        paddingRight: '2rem',
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
            dir={isRTL ? 'rtl' : 'ltr'}
            className="text-center leading-loose mb-4"
            style={{
              transform: isActiveLine ? 'scale(1)' : 'scale(0.84)',
              opacity: isActiveLine ? 1 : isPastLine ? 0.18 : 0.24,
              transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
              fontSize: '2rem',
              fontWeight: 500,
            }}
          >
            {line.words.map((word, wi) => {
              const isActive   = isActiveLine && wi === activeWi;
              const isPastWord = offset + wi < flatIdx;

              return (
                <span
                  key={wi}
                  onClick={() => onWordClick?.(word.start)}
                  className="cursor-pointer"
                  style={{
                    display: 'inline-block',
                    margin: '0 0.2em',
                    unicodeBidi: 'isolate',
                    // Color: active word pops in purple, past words white, future words dimmed
                    color: isActive
                      ? '#a855f7'
                      : isActiveLine
                      ? isPastWord ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.38)'
                      : '#ffffff',
                    // Glow only on active word
                    textShadow: isActive
                      ? '0 0 18px rgba(168,85,247,0.95), 0 0 40px rgba(168,85,247,0.5), 0 0 70px rgba(168,85,247,0.2)'
                      : 'none',
                    // Scale up the active word for the pop effect
                    transform: isActive ? 'scale(1.18)' : 'scale(1)',
                    transformOrigin: 'center 80%',
                    // Single smooth transition on every property
                    transition: 'color 0.15s ease-out, text-shadow 0.2s ease-out, transform 0.2s ease-out, opacity 0.15s ease-out',
                  }}
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
