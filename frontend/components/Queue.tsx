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
    const to   = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);
    onReorder(reordered);
    reset();
  };

  const reset = () => { setDragId(null); setDragOverId(null); };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold text-white">Up Next</h2>
        {queue.length > 0 && (
          <button
            onClick={onNext}
            className="text-xs text-text-dim hover:text-white transition-colors flex items-center gap-1.5 press-effect"
          >
            Skip
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>
        )}
      </div>

      {/* Now playing */}
      {currentItem && (
        <div
          className="px-4 py-3 shrink-0"
          style={{
            background: 'rgba(var(--accent-rgb),0.05)',
            borderBottom: '1px solid rgba(var(--accent-rgb),0.12)',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: 'var(--accent)', textShadow: '0 0 10px rgba(var(--accent-rgb),0.5)' }}
          >
            ♪ Now Playing
          </p>
          <p dir="auto" className="text-sm text-white font-medium truncate" style={{ unicodeBidi: 'plaintext' }}>{currentItem.title}</p>
          {currentItem.artist && (
            <p dir="auto" className="text-[11px] text-text-dim mt-0.5" style={{ unicodeBidi: 'plaintext' }}>{currentItem.artist}</p>
          )}
        </div>
      )}

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto py-2">
        {queue.length === 0 ? (
          <div className="py-12 text-center text-text-dim text-xs">Queue is empty</div>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={() => drop(item.id)}
              onDragEnd={reset}
              className="flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-xl group transition-all duration-150"
              style={{
                cursor: 'grab',
                background: dragOverId === item.id ? 'rgba(var(--accent-rgb),0.07)' : undefined,
                boxShadow: dragOverId === item.id ? 'inset 0 0 0 1px rgba(var(--accent-rgb),0.2)' : undefined,
              }}
              onMouseEnter={(e) => {
                if (dragOverId !== item.id)
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
              }}
              onMouseLeave={(e) => {
                if (dragOverId !== item.id)
                  (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              {/* Drag handle + number */}
              <div className="flex flex-col items-center gap-0.5 shrink-0 w-5">
                <span className="text-[10px] text-text-dim tabular-nums">{idx + 1}</span>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="var(--color-text-dim)">
                  <circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="6" r="1.5"/>
                  <circle cx="6" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/>
                  <circle cx="6" cy="14" r="1.5"/><circle cx="14" cy="14" r="1.5"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p dir="auto" className="text-sm text-white truncate font-medium" style={{ unicodeBidi: 'plaintext' }}>{item.title}</p>
                {item.artist && <p dir="auto" className="text-[11px] text-text-dim mt-0.5" style={{ unicodeBidi: 'plaintext' }}>{item.artist}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-text-dim tabular-nums">{fmt(item.duration)}</span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-text-dim hover:text-red-400"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
