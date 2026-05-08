import { Song } from '@/types';

const BASE = '/api';

export async function fetchSongs(): Promise<Song[]> {
  const res = await fetch(`${BASE}/songs`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
}

export async function fetchSong(id: string): Promise<Song> {
  const res = await fetch(`${BASE}/songs/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Song not found');
  return res.json();
}

export function getOriginalUrl(song: Song): string {
  return `${BASE}/songs/${song.id}/stream/original`;
}

export function getInstrumentalUrl(song: Song): string {
  return `${BASE}/songs/${song.id}/stream/instrumental`;
}

export function getVocalsUrl(song: Song): string {
  return `${BASE}/songs/${song.id}/stream/vocals`;
}

export async function uploadSong(
  file: File,
  lyrics: string,
  onProgress?: (pct: number) => void,
): Promise<Song> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    if (lyrics.trim()) fd.append('lyrics', lyrics.trim());
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status < 300
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(xhr.responseText));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

export async function deleteSong(id: string): Promise<void> {
  await fetch(`${BASE}/songs/${id}`, { method: 'DELETE' });
}

export async function updateLyrics(songId: string, lyrics: string): Promise<Song> {
  const fd = new FormData();
  fd.append('lyrics', lyrics);
  const res = await fetch(`${BASE}/songs/${songId}/lyrics`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
