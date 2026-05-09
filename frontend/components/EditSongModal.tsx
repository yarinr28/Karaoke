'use client';
import { useState, useEffect } from 'react';
import { Song } from '@/types';
import { updateSong } from '@/lib/api';

interface Props {
  song: Song;
  onClose: () => void;
  onSaved: (updated: Song) => void;
}

function lyricsToText(song: Song): string {
  if (song.provided_lyrics) return song.provided_lyrics;
  if (!song.lyrics) return '';
  return song.lyrics.lines.map((line) => line.words.map((w) => w.word).join(' ')).join('\n');
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#ffffff',
  outline: 'none',
};

export default function EditSongModal({ song, onClose, onSaved }: Props) {
  const [title, setTitle]   = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [lyrics, setLyrics] = useState(() => lyricsToText(song));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const originalLyrics = lyricsToText(song);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { title?: string; artist?: string; lyrics?: string } = {
        title: title.trim(),
        artist: artist.trim(),
      };
      if (lyrics.trim() !== originalLyrics.trim()) payload.lyrics = lyrics.trim();
      const updated = await updateSong(song.id, payload);
      onSaved(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-scale-in"
        style={{
          background: 'rgba(10,8,20,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-white">Edit Song</h2>
          <button onClick={onClose} className="text-text-dim hover:text-white text-lg leading-none transition-colors">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-dim mb-1.5">Song Title</label>
            <input
              type="text"
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Artist</label>
            <input
              type="text"
              dir="auto"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3 py-2 text-sm"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">
              Lyrics <span className="text-text-dim/50">(editing will re-sync timestamps)</span>
            </label>
            <textarea
              dir="auto"
              rows={9}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono leading-relaxed resize-none"
              style={{ ...inputStyle, color: 'rgba(255,255,255,0.85)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm text-text-dim hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all press-effect disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'rgba(168,85,247,0.9)', color: '#030308' }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
