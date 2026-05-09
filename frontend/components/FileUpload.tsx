'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Song } from '@/types';
import { uploadSong } from '@/lib/api';

interface Props {
  onUploaded: (song: Song) => void;
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function FileUpload({ onUploaded }: Props) {
  const [open, setOpen]         = useState(false);
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [title, setTitle]       = useState('');
  const [artist, setArtist]     = useState('');
  const [lyrics, setLyrics]     = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setTitle('');
    setArtist('');
    setLyrics('');
    setError(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const close = useCallback(() => {
    if (progress !== null) return; // don't close while uploading
    reset();
    setOpen(false);
  }, [progress, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const pickFile = (f: File) => {
    setFile(f);
    setTitle(titleFromFilename(f.name));
    setError(null);
  };

  const submit = async () => {
    if (!file || !title.trim() || !artist.trim()) return;
    setProgress(0);
    setError(null);
    try {
      const song = await uploadSong(file, lyrics, setProgress, title.trim(), artist.trim());
      onUploaded(song);
      reset();
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setProgress(null);
    }
  };

  const canSubmit = !!file && title.trim().length > 0 && artist.trim().length > 0 && progress === null;

  return (
    <>
      {/* ── Sidebar trigger button ─────────────────────────────────────────── */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2 rounded-lg border border-border text-text-dim hover:text-white hover:border-accent/60 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Song
        </button>
      </div>

      {/* ── Modal overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <h2 className="text-sm font-semibold text-white">Upload Song</h2>
              <button onClick={close} className="text-text-dim hover:text-white text-lg leading-none transition-colors">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) pickFile(f);
                }}
                onClick={() => !file && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-5 text-center transition-all ${
                  file
                    ? 'border-accent/40 cursor-default'
                    : dragging
                    ? 'border-accent-bright bg-purple-900/10 cursor-copy'
                    : 'border-border hover:border-accent/60 cursor-pointer'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp3,.wav,.ogg,.flac,.m4a,.aac"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-base">🎵</span>
                    <span className="text-xs text-accent-bright truncate max-w-[260px]">{file.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="text-text-dim hover:text-white text-sm leading-none ml-1"
                    >×</button>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-1.5 opacity-40">📂</div>
                    <p className="text-xs text-text-dim">
                      Drop audio file or <span className="text-accent-bright">browse</span>
                    </p>
                    <p className="text-[10px] text-text-dim/50 mt-0.5">MP3 · WAV · OGG · FLAC · M4A · AAC</p>
                  </>
                )}
              </div>

              {/* Song Title */}
              <div>
                <label className="block text-xs text-text-dim mb-1">
                  Song Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter song title"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim/50 outline-none focus:border-accent"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs text-text-dim mb-1">
                  Artist <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Enter artist name"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim/50 outline-none focus:border-accent"
                />
              </div>

              {/* Lyrics */}
              <div>
                <label className="block text-xs text-text-dim mb-1">
                  Lyrics <span className="text-text-dim/50">(optional — enables forced alignment)</span>
                </label>
                <textarea
                  dir="auto"
                  rows={5}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={"Paste lyrics here…\nThe AI will sync timestamps to your exact words."}
                  className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-xs text-white placeholder-text-dim/40 resize-none focus:outline-none focus:border-accent/60 font-mono leading-relaxed"
                />
              </div>

              {/* Progress */}
              {progress !== null && (
                <div>
                  <p className="text-xs text-text-dim mb-1.5">Uploading…</p>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent-bright transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-400 text-center">{error}</p>}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={close}
                  disabled={progress !== null}
                  className="flex-1 py-2 rounded-lg border border-border text-text-dim hover:text-white hover:border-white/30 text-sm transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-bright disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  {progress !== null ? 'Uploading…' : 'Upload & Process'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
