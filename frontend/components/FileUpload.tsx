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

const inputStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text)',
  outline: 'none',
};

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
    setFile(null); setTitle(''); setArtist(''); setLyrics('');
    setError(null); setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const close = useCallback(() => {
    if (progress !== null) return;
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
      {/* Sidebar trigger */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all press-effect"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-rgb),0.3)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-dim)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Song
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-scale-in"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(40px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                className="rounded-xl px-4 py-5 text-center transition-all"
                style={{
                  border: `2px dashed ${dragging ? 'rgba(var(--accent-rgb),0.5)' : file ? 'rgba(var(--accent-rgb),0.25)' : 'var(--color-border)'}`,
                  background: dragging ? 'rgba(var(--accent-rgb),0.04)' : 'transparent',
                  cursor: file ? 'default' : 'pointer',
                }}
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
                    <span className="text-xs truncate max-w-[240px]" style={{ color: 'var(--accent)' }}>{file.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="text-text-dim hover:text-white text-sm leading-none ml-1"
                    >×</button>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-1.5 opacity-30">📂</div>
                    <p className="text-xs text-text-dim">
                      Drop audio file or <span style={{ color: 'var(--accent)' }}>browse</span>
                    </p>
                    <p className="text-[10px] text-text-dim/50 mt-0.5">MP3 · WAV · OGG · FLAC · M4A · AAC</p>
                  </>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs text-text-dim mb-1.5">
                  Song Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter song title"
                  className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs text-text-dim mb-1.5">
                  Artist <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Enter artist name"
                  className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Lyrics */}
              <div>
                <label className="block text-xs text-text-dim mb-1.5">
                  Lyrics <span className="text-text-dim/50">(optional — enables forced alignment)</span>
                </label>
                <textarea
                  dir="auto"
                  rows={5}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={"Paste lyrics here…\nThe AI will sync timestamps to your exact words."}
                  className="w-full px-3 py-2 text-xs font-mono leading-relaxed resize-none placeholder:text-text-dim/40"
                  style={{ ...inputStyle, color: 'var(--color-text)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {/* Progress */}
              {progress !== null && (
                <div>
                  <p className="text-xs text-text-dim mb-1.5">Uploading…</p>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: 'var(--accent)', boxShadow: '0 0 10px rgba(var(--accent-rgb),0.5)' }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-400 text-center">{error}</p>}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={close}
                  disabled={progress !== null}
                  className="flex-1 py-2 rounded-xl text-sm text-text-dim hover:text-white transition-colors disabled:opacity-40"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all press-effect disabled:opacity-40"
                  style={{ background: canSubmit ? 'rgba(var(--accent-rgb),0.9)' : 'var(--color-surface)', color: canSubmit ? '#030308' : 'var(--color-text-dim)' }}
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
