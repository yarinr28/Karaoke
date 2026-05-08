import { useRef, useState } from 'react';
import { QueueItem } from '../types';

interface Props {
  queue: QueueItem[];
  currentItem: QueueItem | null;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onNext: () => void;
}

function fmt(s: number) {
  if (!s || !isFinite(s)) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function Queue({ queue, currentItem, onRemove, onReorder, onNext }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const ids = queue.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);
    onReorder(reordered);
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-white">Up Next</h2>
        {queue.length > 0 && (
          <button
            onClick={onNext}
            className="text-xs text-accent-bright hover:text-white transition-colors"
          >
            Skip ⏭
          </button>
        )}
      </div>

      {currentItem && (
        <div className="px-4 py-2.5 bg-active-item border-b border-border shrink-0">
          <p className="text-[10px] text-accent-bright font-semibold uppercase tracking-wider mb-0.5">
            Now Playing
          </p>
          <p className="text-sm text-white font-medium truncate">{currentItem.title}</p>
          {currentItem.artist && (
            <p className="text-xs text-text-dim truncate">{currentItem.artist}</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="p-6 text-center text-text-dim text-xs">
            Queue is empty.<br />Add songs with the + button.
          </div>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 group transition-colors cursor-grab active:cursor-grabbing ${
                dragOverId === item.id ? 'bg-active-item' : 'hover:bg-surface'
              }`}
            >
              <span className="text-text-dim text-xs w-4 shrink-0">{idx + 1}</span>
              <span className="text-text-dim text-xs mr-1">⠿</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm text-white truncate">{item.title}</span>
                <span className="text-xs text-text-dim truncate">{item.artist}</span>
              </div>
              <span className="text-xs text-text-dim shrink-0">{fmt(item.duration)}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm ml-1 shrink-0"
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
