import { Song } from '../types';

const BASE = '/api';

export async function fetchSongs(): Promise<Song[]> {
  const res = await fetch(`${BASE}/songs`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
}

export async function fetchLyrics(songId: string): Promise<string> {
  const res = await fetch(`${BASE}/songs/${songId}/lyrics`);
  if (!res.ok) throw new Error('No lyrics');
  const data = await res.json();
  return data.lrc as string;
}

export function getStreamUrl(songId: string): string {
  return `${BASE}/songs/${songId}/stream`;
}

export function getInstrumentalUrl(songId: string): string {
  return `${BASE}/songs/${songId}/instrumental`;
}

export async function uploadAudio(file: File, onProgress?: (pct: number) => void): Promise<Song> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('audio', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload/audio`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

export async function uploadLrc(songId: string, file: File): Promise<Song> {
  const fd = new FormData();
  fd.append('lrc', file);
  const res = await fetch(`${BASE}/upload/${songId}/lrc`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('LRC upload failed');
  return res.json();
}

export async function startVocalSeparation(songId: string): Promise<void> {
  const res = await fetch(`${BASE}/vocal/${songId}/separate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start vocal separation');
}

export async function getVocalStatus(songId: string) {
  const res = await fetch(`${BASE}/vocal/${songId}/status`);
  if (!res.ok) throw new Error('Failed to get status');
  return res.json() as Promise<{
    processingState: string;
    processingError: string | null;
    hasInstrumental: boolean;
  }>;
}
