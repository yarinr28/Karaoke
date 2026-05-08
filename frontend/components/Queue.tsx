'use client';
import { useState } from 'react';
import { QueueItem } from '@/types';

interface Props {
  queue: QueueItem[];
  currentItem: QueueItem | null;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onNext: () => void;
}

function fmt(s: number) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function Queue({ queue, currentItem, onRemove, onReorder, onNext }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return reset();
    const ids = queue.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);
    onReorder(reordered);
    reset();
  };

  const reset = () => { setDragId(null); setDragOverId(null); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-white">Up Next</h2>
        {queue.length > 0 && (
          <button onClick={onNext} className="text-xs text-accent-bright hover:text-white">
            Skip ⏭
          </button>
        )}
      </div>

      {currentItem && (
        <div className="px-4 py-2.5 bg-active-bg border-b border-border shrink-0">
          <p className="text-[10px] text-accent-bright font-semibold uppercase tracking-wider">Now Playing</p>
          <p className="text-sm text-white font-medium truncate mt-0.5">{currentItem.title}</p>
          {currentItem.artist && <p className="text-xs text-text-dim">{currentItem.artist}</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="py-8 text-center text-text-dim text-xs">Queue is empty</div>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={() => drop(item.id)}
              onDragEnd={reset}
              className={`flex items-center gap-2 px-4 py-2.5 group cursor-grab transition-colors ${
                dragOverId === item.id ? 'bg-active-bg' : 'hover:bg-surface'
              }`}
            >
              <span className="text-text-dim text-xs w-4">{idx + 1}</span>
              <span className="text-text-dim text-xs">⠿</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.title}</p>
                {item.artist && <p className="text-xs text-text-dim">{item.artist}</p>}
              </div>
              <span className="text-xs text-text-dim shrink-0">{fmt(item.duration)}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm ml-1 shrink-0"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
