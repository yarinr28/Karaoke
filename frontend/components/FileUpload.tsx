'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Song } from '@/types';
import { uploadSong, uploadManual } from '@/lib/api';

interface Props {
  onUploaded: (song: Song) => void;
}

type Tab = 'ai' | 'manual';

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

function FilePicker({
  label, required = false, file, inputRef, accept, hint, onPick, onClear,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  hint: string;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-dim)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files[0]; if (f) onPick(f);
        }}
        onClick={() => !file && inputRef.current?.click()}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
        style={{
          border: `1.5px dashed ${drag ? 'rgba(var(--accent-rgb),0.5)' : file ? 'rgba(var(--accent-rgb),0.3)' : 'var(--color-border)'}`,
          background: drag ? 'rgba(var(--accent-rgb),0.04)' : 'var(--color-surface)',
          cursor: file ? 'default' : 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
        {file ? (
          <>
            <span className="text-xs truncate flex-1" style={{ color: 'var(--accent)' }}>{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-text-dim hover:text-white text-base leading-none shrink-0 transition-colors"
            >×</button>
          </>
        ) : (
          <>
            <span className="text-xs flex-1" style={{ color: 'var(--color-text-dim)' }}>
              Drop or <span style={{ color: 'var(--accent)' }}>browse</span>
            </span>
            <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-dim)', opacity: 0.5 }}>{hint}</span>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>Uploading…</p>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: 'var(--accent)', boxShadow: '0 0 10px rgba(var(--accent-rgb),0.5)' }}
        />
      </div>
    </div>
  );
}

export default function FileUpload({ onUploaded }: Props) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<Tab>('ai');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError]   = useState<string | null>(null);

  // Shared metadata
  const [title, setTitle]   = useState('');
  const [artist, setArtist] = useState('');

  // AI tab
  const [aiFile, setAiFile]       = useState<File | null>(null);
  const [aiLyrics, setAiLyrics]   = useState('');
  const [aiDragging, setAiDrag]   = useState(false);
  const aiRef = useRef<HTMLInputElement>(null!);

  // Manual tab
  const [origFile, setOrigFile]   = useState<File | null>(null);
  const [instFile, setInstFile]   = useState<File | null>(null);
  const [vocFile, setVocFile]     = useState<File | null>(null);
  const [metaJson, setMetaJson]   = useState('');
  const origRef = useRef<HTMLInputElement>(null!);
  const instRef = useRef<HTMLInputElement>(null!);
  const vocRef  = useRef<HTMLInputElement>(null!);

  const reset = useCallback(() => {
    setAiFile(null); setAiLyrics(''); setAiDrag(false);
    setOrigFile(null); setInstFile(null); setVocFile(null); setMetaJson('');
    setTitle(''); setArtist('');
    setError(null); setProgress(null);
    [aiRef, origRef, instRef, vocRef].forEach((r) => { if (r.current) r.current.value = ''; });
  }, []);

  const close = useCallback(() => {
    if (progress !== null) return;
    reset(); setOpen(false);
  }, [progress, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleMetaJson = (value: string) => {
    setMetaJson(value);
    try {
      const p = JSON.parse(value.trim());
      if (p.title)  setTitle(String(p.title));
      if (p.artist) setArtist(String(p.artist));
    } catch { /* not valid JSON yet */ }
  };

  const canAI     = !!aiFile && !!title.trim() && !!artist.trim() && progress === null;
  const canManual = !!origFile && !!instFile && !!title.trim() && progress === null;

  const submitAI = async () => {
    if (!aiFile || !title.trim() || !artist.trim()) return;
    setProgress(0); setError(null);
    try {
      const song = await uploadSong(aiFile, aiLyrics, setProgress, title.trim(), artist.trim());
      onUploaded(song); reset(); setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed'); setProgress(null);
    }
  };

  const submitManual = async () => {
    if (!origFile || !instFile || !title.trim()) return;
    setProgress(0); setError(null);
    try {
      const song = await uploadManual(origFile, instFile, title.trim(), artist.trim(), metaJson, vocFile, setProgress);
      onUploaded(song); reset(); setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed'); setProgress(null);
    }
  };

  const actionStyle = (active: boolean) => ({
    background: active ? 'rgba(var(--accent-rgb),0.9)' : 'var(--color-surface)',
    color: active ? '#030308' : 'var(--color-text-dim)',
  });

  return (
    <>
      {/* Sidebar trigger */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all press-effect"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
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
            className="w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-scale-in flex flex-col overflow-hidden"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(40px)',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Upload Song</h2>
              <button onClick={close} className="text-text-dim hover:text-white text-lg leading-none transition-colors">×</button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              {([['ai', '✦ AI Processing'], ['manual', '⚙ Manual Upload']] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color: tab === t ? 'var(--accent)' : 'var(--color-text-dim)',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-4">

                {tab === 'ai' ? (
                  /* ── AI Processing tab ─────────────────────────────── */
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setAiDrag(true); }}
                      onDragLeave={() => setAiDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault(); setAiDrag(false);
                        const f = e.dataTransfer.files[0];
                        if (f) { setAiFile(f); if (!title) setTitle(titleFromFilename(f.name)); }
                      }}
                      onClick={() => !aiFile && aiRef.current?.click()}
                      className="rounded-xl px-4 py-5 text-center transition-all"
                      style={{
                        border: `2px dashed ${aiDragging ? 'rgba(var(--accent-rgb),0.5)' : aiFile ? 'rgba(var(--accent-rgb),0.25)' : 'var(--color-border)'}`,
                        background: aiDragging ? 'rgba(var(--accent-rgb),0.04)' : 'transparent',
                        cursor: aiFile ? 'default' : 'pointer',
                      }}
                    >
                      <input
                        ref={aiRef}
                        type="file"
                        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setAiFile(f); if (!title) setTitle(titleFromFilename(f.name)); }
                        }}
                      />
                      {aiFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-base">🎵</span>
                          <span className="text-xs truncate max-w-[240px]" style={{ color: 'var(--accent)' }}>{aiFile.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAiFile(null); if (aiRef.current) aiRef.current.value = ''; }}
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

                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
                        Song Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter song title" className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
                        Artist <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text" dir="auto" value={artist} onChange={(e) => setArtist(e.target.value)}
                        placeholder="Enter artist name" className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
                        Lyrics <span style={{ opacity: 0.5 }}>(optional — enables forced alignment)</span>
                      </label>
                      <textarea
                        dir="auto" rows={5} value={aiLyrics} onChange={(e) => setAiLyrics(e.target.value)}
                        placeholder={"Paste lyrics here…\nThe AI will sync timestamps to your exact words."}
                        className="w-full px-3 py-2 text-xs font-mono leading-relaxed resize-none placeholder:text-text-dim/40"
                        style={{ ...inputStyle, color: 'var(--color-text)' }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    {progress !== null && <ProgressBar progress={progress} />}
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={close} disabled={progress !== null}
                        className="flex-1 py-2 rounded-xl text-sm text-text-dim hover:text-white transition-colors disabled:opacity-40"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      >Cancel</button>
                      <button
                        onClick={submitAI} disabled={!canAI}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all press-effect disabled:opacity-40"
                        style={actionStyle(canAI)}
                      >
                        {progress !== null ? 'Uploading…' : 'Upload & Process'}
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Manual Upload tab ─────────────────────────────── */
                  <>
                    {/* MongoDB JSON paste */}
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
                        Paste MongoDB JSON{' '}
                        <span style={{ opacity: 0.5 }}>(auto-fills title, artist &amp; lyrics)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={metaJson}
                        onChange={(e) => handleMetaJson(e.target.value)}
                        placeholder={'{\n  "title": "Song Name",\n  "artist": "Artist Name"\n}'}
                        className="w-full px-3 py-2 text-xs font-mono leading-relaxed resize-none placeholder:text-text-dim/40"
                        style={{ ...inputStyle, color: 'var(--color-text)' }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
                          Song Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)}
                          placeholder="Song title" className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                          style={inputStyle}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-dim)' }}>Artist</label>
                        <input
                          type="text" dir="auto" value={artist} onChange={(e) => setArtist(e.target.value)}
                          placeholder="Artist name" className="w-full px-3 py-2 text-sm placeholder:text-text-dim/50"
                          style={inputStyle}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.35)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        />
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-3 space-y-3"
                      style={{ background: 'rgba(var(--accent-rgb),0.03)', border: '1px solid rgba(var(--accent-rgb),0.1)' }}
                    >
                      <FilePicker
                        label="Original Audio" required
                        file={origFile} inputRef={origRef}
                        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac" hint="MP3 · WAV · FLAC"
                        onPick={setOrigFile}
                        onClear={() => { setOrigFile(null); if (origRef.current) origRef.current.value = ''; }}
                      />
                      <FilePicker
                        label="Instrumental Audio" required
                        file={instFile} inputRef={instRef}
                        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac" hint="MP3 · WAV · FLAC"
                        onPick={setInstFile}
                        onClear={() => { setInstFile(null); if (instRef.current) instRef.current.value = ''; }}
                      />
                      <FilePicker
                        label="Vocals Audio"
                        file={vocFile} inputRef={vocRef}
                        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac" hint="MP3 · WAV · FLAC"
                        onPick={setVocFile}
                        onClear={() => { setVocFile(null); if (vocRef.current) vocRef.current.value = ''; }}
                      />
                    </div>

                    {progress !== null && <ProgressBar progress={progress} />}
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={close} disabled={progress !== null}
                        className="flex-1 py-2 rounded-xl text-sm text-text-dim hover:text-white transition-colors disabled:opacity-40"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      >Cancel</button>
                      <button
                        onClick={submitManual} disabled={!canManual}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all press-effect disabled:opacity-40 flex items-center justify-center gap-2"
                        style={actionStyle(canManual)}
                      >
                        {progress !== null ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            Uploading…
                          </>
                        ) : 'Upload'}
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
