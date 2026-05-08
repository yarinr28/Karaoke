'use client';
import { useEffect, useState, useCallback } from 'react';
import { Song } from '@/types';
import { fetchSong } from '@/lib/api';

interface Props {
  song: Song;
  onReady: (updated: Song) => void;
}

const STATE_ICON: Record<string, string> = {
  queued: '⏳',
  separating: '🎛',
  fetching_lyrics: '🔍',
  aligning: '🎯',
  transcribing: '📝',
  done: '✅',
  error: '❌',
};

export default function ProcessingStatus({ song, onReady }: Props) {
  const [current, setCurrent] = useState(song);

  const poll = useCallback(async () => {
    try {
      const updated = await fetchSong(song.id);
      setCurrent(updated);
      if (updated.processing_state === 'done') {
        onReady(updated);
      }
    } catch {
      // ignore
    }
  }, [song.id, onReady]);

  useEffect(() => {
    if (current.processing_state === 'done' || current.processing_state === 'error') return;
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [current.processing_state, poll]);

  if (current.processing_state === 'done') return null;

  return (
    <div className="px-4 py-3 bg-surface border border-border rounded-xl">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg">
          {STATE_ICON[current.processing_state] || '⏳'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{current.title}</p>
          <p className="text-xs text-text-dim">{current.processing_step}</p>
        </div>
        <span className="text-xs text-accent-bright font-mono shrink-0">
          {current.processing_progress}%
        </span>
      </div>

      {current.processing_state !== 'error' && (
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-bright transition-all duration-500"
            style={{ width: `${current.processing_progress}%` }}
          />
        </div>
      )}

      {current.processing_state === 'error' && (
        <p className="text-xs text-red-400 mt-1">{current.processing_error}</p>
      )}
    </div>
  );
}
