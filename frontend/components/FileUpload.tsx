'use client';
import { useRef, useState } from 'react';
import { Song } from '@/types';
import { uploadSong } from '@/lib/api';

interface Props {
  onUploaded: (song: Song) => void;
}

export default function FileUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setProgress(0);
    try {
      const song = await uploadSong(files[0], lyrics, setProgress);
      onUploaded(song);
      setLyrics('');
      setShowLyrics(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 border-t border-border shrink-0">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        onClick={() => !showLyrics && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-3 py-4 text-center transition-all ${
          showLyrics ? 'cursor-default' : 'cursor-pointer'
        } ${dragging ? 'border-accent-bright bg-purple-900/10' : 'border-border hover:border-accent/60'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.flac,.m4a,.aac"
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        {progress !== null ? (
          <>
            <p className="text-xs text-text-dim mb-2">Uploading…</p>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent-bright transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <div
              className="text-3xl mb-1 opacity-40 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              📂
            </div>
            <p
              className="text-xs text-text-dim cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              Drop MP3 or <span className="text-accent-bright">browse</span>
            </p>
            <p className="text-[10px] text-text-dim/50 mt-0.5">Auto-processes with AI</p>
          </>
        )}
      </div>

      {/* Lyrics panel */}
      <button
        onClick={() => setShowLyrics((v) => !v)}
        className="w-full mt-2 text-[11px] text-text-dim/60 hover:text-accent-bright flex items-center justify-center gap-1 transition-colors"
      >
        <span>{showLyrics ? '▲' : '▼'}</span>
        <span>{showLyrics ? 'Hide lyrics' : 'Paste lyrics for precise alignment (optional)'}</span>
      </button>

      {showLyrics && (
        <div className="mt-1.5 space-y-1">
          <textarea
            dir="auto"
            placeholder={"Paste the correct lyrics here.\nThe AI will align them to the audio\nusing Dynamic Time Warping (DTW)."}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={6}
            className="w-full rounded-lg bg-surface border border-border px-2.5 py-2 text-xs text-text placeholder-text-dim/40 resize-none focus:outline-none focus:border-accent/60 font-mono leading-relaxed"
          />
          {lyrics.trim() && (
            <p className="text-[10px] text-accent-bright/70 text-center">
              Forced alignment active — exact words will be used
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-1.5 text-center">{error}</p>}
    </div>
  );
}
