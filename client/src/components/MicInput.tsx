import { useState, useCallback } from 'react';
import { useMic } from '../hooks/useAudio';

export default function MicInput() {
  const [active, setActive] = useState(false);
  const [vol, setVol] = useState(0.8);
  const { start, stop, setVolume } = useMic();

  const toggle = useCallback(async () => {
    if (active) {
      stop();
      setActive(false);
    } else {
      try {
        await start();
        setActive(true);
      } catch {
        alert('Microphone access denied');
      }
    }
  }, [active, start, stop]);

  const handleVol = (v: number) => {
    setVol(v);
    setVolume(v);
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggle}
        title={active ? 'Disable mic' : 'Enable mic'}
        className={`px-3 py-1 rounded text-xs font-medium border transition-colors shrink-0 ${
          active
            ? 'bg-red-900/40 border-red-500 text-red-300 animate-pulse'
            : 'border-border text-text-dim hover:border-accent hover:text-white'
        }`}
      >
        🎤 {active ? 'ON' : 'Mic'}
      </button>

      {active && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => handleVol(parseFloat(e.target.value))}
          className="w-16"
          title="Mic volume"
        />
      )}
    </div>
  );
}
