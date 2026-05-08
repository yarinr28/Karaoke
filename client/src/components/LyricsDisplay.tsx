import { useEffect, useRef, useState } from 'react';
import { LyricLine } from '../types';
import { fetchLyrics } from '../services/api';

interface Props {
  songId: string | null;
  currentTime: number;
  onSeek: (time: number) => void;
}

function parseLRC(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let offset = 0;
  const timeRe = /\[(\d{1,2}):(\d{2})[.:](\d{2,3})\]/g;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const offsetMatch = line.match(/^\[offset:\s*([+-]?\d+)\]/i);
    if (offsetMatch) { offset = parseInt(offsetMatch[1]) / 1000; continue; }
    if (/^\[(?:ar|ti|al|au|by|re|ve|length):/i.test(line)) continue;

    const times: number[] = [];
    let match: RegExpExecArray | null;
    let lastEnd = 0;
    timeRe.lastIndex = 0;

    while ((match = timeRe.exec(line)) !== null) {
      const ms = parseInt(match[3].padEnd(3, '0'));
      times.push(parseInt(match[1]) * 60 + parseInt(match[2]) + ms / 1000 + offset);
      lastEnd = match.index + match[0].length;
    }

    if (!times.length) continue;

    // Enhanced LRC: parse word-level timestamps <mm:ss.xx>word
    const textPart = line.slice(lastEnd);
    const wordRe = /<(\d{1,2}):(\d{2})[.:](\d{2,3})>([^<]*)/g;
    const words: LyricLine['words'] = [];
    let wMatch: RegExpExecArray | null;

    while ((wMatch = wordRe.exec(textPart)) !== null) {
      const wMs = parseInt(wMatch[3].padEnd(3, '0'));
      const wTime = parseInt(wMatch[1]) * 60 + parseInt(wMatch[2]) + wMs / 1000;
      const wText = wMatch[4].trim();
      if (wText) words.push({ time: wTime, text: wText });
    }

    const plainText = (words.length ? words.map((w) => w.text).join(' ') : textPart.trim()) || '♪';

    for (const t of times) {
      lines.push({ time: t, text: plainText, words: words.length ? words : undefined });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

function findActiveIndex(lyrics: LyricLine[], currentTime: number): number {
  let idx = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) { idx = i; break; }
  }
  return idx;
}

export default function LyricsDisplay({ songId, currentTime, onSeek }: Props) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const prevSongId = useRef<string | null>(null);

  useEffect(() => {
    if (!songId || songId === prevSongId.current) return;
    prevSongId.current = songId;
    setLyrics([]);
    setActiveIdx(-1);

    fetchLyrics(songId)
      .then((lrc) => setLyrics(parseLRC(lrc)))
      .catch(() => setLyrics([]));
  }, [songId]);

  useEffect(() => {
    if (!lyrics.length) return;
    const newIdx = findActiveIndex(lyrics, currentTime);
    if (newIdx === activeIdx) return;
    setActiveIdx(newIdx);

    if (newIdx >= 0 && listRef.current) {
      const el = listRef.current.children[newIdx] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, lyrics, activeIdx]);

  if (!songId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim select-none">
        <div className="text-8xl mb-6 opacity-40">🎤</div>
        <p className="text-xl">Select a song to start singing</p>
      </div>
    );
  }

  if (!lyrics.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim select-none">
        <div className="text-8xl mb-6 opacity-40">🎵</div>
        <p className="text-xl">No lyrics available</p>
        <p className="text-sm mt-2 opacity-60">Upload a .lrc file for this song</p>
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      className="w-full h-full overflow-y-auto px-16 scrollbar-none"
      style={{ paddingTop: '42vh', paddingBottom: '42vh', scrollbarWidth: 'none' }}
    >
      {lyrics.map((line, i) => {
        const dist = Math.abs(i - activeIdx);
        const isActive = i === activeIdx;
        const isNear = dist <= 2 && dist > 0;

        return (
          <li
            key={`${line.time}-${i}`}
            onClick={() => onSeek(line.time)}
            className={[
              'text-center px-4 py-2 cursor-pointer transition-all duration-300 leading-relaxed select-none',
              isActive
                ? 'text-4xl font-bold text-white opacity-100 scale-105 animate-glow'
                : isNear
                ? 'text-2xl font-medium text-slate-300 opacity-65 scale-95'
                : 'text-xl font-normal text-text-dim opacity-30 scale-90',
            ].join(' ')}
            style={{ transform: `scale(${isActive ? 1 : isNear ? 0.94 : 0.9})` }}
          >
            {line.words ? (
              line.words.map((w, wi) => (
                <span
                  key={wi}
                  className={
                    isActive && currentTime >= w.time
                      ? 'text-accent-bright'
                      : 'inherit'
                  }
                >
                  {w.text}{' '}
                </span>
              ))
            ) : (
              line.text
            )}
          </li>
        );
      })}
    </ul>
  );
}
