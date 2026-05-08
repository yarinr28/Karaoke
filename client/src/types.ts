export interface Song {
  _id: string;
  title: string;
  artist: string;
  filename: string;
  instrumentalFilename: string | null;
  lrcFilename: string | null;
  duration: number;
  processingState: 'idle' | 'processing' | 'done' | 'error';
  processingError: string | null;
  createdAt: string;
}

export interface LyricLine {
  time: number;
  text: string;
  words?: LyricWord[];
}

export interface LyricWord {
  time: number;
  text: string;
}

export interface QueueItem {
  id: string;
  songId: string;
  title: string;
  artist: string;
  duration: number;
  addedBy: string;
  hasInstrumental: boolean;
}

export interface SessionState {
  hostSocketId: string;
  queue: QueueItem[];
  currentItem: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
}
