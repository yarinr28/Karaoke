export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface LyricsLine {
  words: WordTimestamp[];
}

export interface LyricsData {
  lines: LyricsLine[];
  language: string;
  is_rtl: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  original_filename: string;
  instrumental_filename: string | null;
  vocals_filename: string | null;
  duration: number;
  processing_state: 'queued' | 'separating' | 'fetching_lyrics' | 'aligning' | 'transcribing' | 'done' | 'error';
  processing_step: string;
  processing_progress: number;
  processing_error: string | null;
  provided_lyrics: string | null;
  lyrics: LyricsData | null;
  language: string | null;
  is_rtl: boolean;
  created_at: string | null;
}

export interface QueueItem {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  duration: number;
  added_by: string;
}

export interface SessionState {
  queue: QueueItem[];
  current_item: QueueItem | null;
}

export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}
