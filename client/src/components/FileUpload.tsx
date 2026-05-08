import { useRef, useState } from 'react';
import { uploadAudio } from '../services/api';
import { Song } from '../types';

interface Props {
  onUploaded: (song: Song) => void;
}

export default function FileUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);
    setProgress(0);
    try {
      const song = await uploadAudio(file, setProgress);
      onUploaded(song);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="p-3 border-t border-border">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-3 py-4 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-accent-bright bg-purple-900/10'
            : 'border-border hover:border-accent'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,.webm"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {progress !== null ? (
          <div>
            <div className="text-xs text-text-dim mb-2">Uploading…</div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-bright transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-1 opacity-50">📁</div>
            <p className="text-xs text-text-dim">
              Drop audio file or <span className="text-accent-bright">browse</span>
            </p>
            <p className="text-[10px] text-text-dim opacity-60 mt-0.5">MP3 · WAV · FLAC · OGG</p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-1.5 text-center">{error}</p>}
    </div>
  );
}
