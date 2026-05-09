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

export default function EditSongModal({ song, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(song.title);
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
      const payload: { title?: string; artist?: string; lyrics?: string } = {};
      if (title.trim() !== song.title) payload.title = title.trim();
      if (artist.trim() !== song.artist) payload.artist = artist.trim();
      if (lyrics.trim() !== originalLyrics.trim()) payload.lyrics = lyrics.trim();

      // Always send title/artist so partial-only changes work
      payload.title = title.trim();
      payload.artist = artist.trim();

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-white">Edit Song</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-dim mb-1">Song Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-white placeholder:text-text-dim outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1">
              Lyrics{' '}
              <span className="text-text-dim/50">(editing will re-sync timestamps)</span>
            </label>
            <textarea
              dir="auto"
              rows={9}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-xs text-white placeholder-text-dim/40 resize-none focus:outline-none focus:border-accent/60 font-mono leading-relaxed"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-text-dim hover:text-white hover:border-white/30 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-bright disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
  );
}
