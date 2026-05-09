'use client';
import { useEffect } from 'react';
import { useTheme, ACCENT_COLORS, Mode } from '@/context/ThemeContext';

interface Props {
  onClose: () => void;
}

export default function ThemeModal({ onClose }: Props) {
  const { mode, accent, setMode, setAccent } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl shadow-2xl animate-scale-in"
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--color-border)',
          backdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Appearance</h2>
          </div>
          <button
            onClick={onClose}
            className="text-sm leading-none transition-colors"
            style={{ color: 'var(--color-text-dim)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-dim)')}
          >×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Mode */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-dim)' }}>Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as Mode[]).map((m) => {
                const isSelected = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all press-effect"
                    style={{
                      background: isSelected ? `rgba(var(--accent-rgb), 0.12)` : 'var(--color-surface)',
                      border: isSelected ? `1px solid rgba(var(--accent-rgb), 0.4)` : '1px solid var(--color-border)',
                      boxShadow: isSelected ? `0 0 16px rgba(var(--accent-rgb), 0.15)` : 'none',
                    }}
                  >
                    {m === 'dark' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'var(--accent)' : 'var(--color-text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'var(--accent)' : 'var(--color-text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                      </svg>
                    )}
                    <span
                      className="text-xs font-medium capitalize"
                      style={{ color: isSelected ? 'var(--accent)' : 'var(--color-text-dim)' }}
                    >
                      {m === 'light' ? 'Light' : 'Dark'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-dim)' }}>Color</p>
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accent.hex === color.hex;
                return (
                  <button
                    key={color.hex}
                    onClick={() => setAccent(color)}
                    title={color.name}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all press-effect"
                    style={{
                      background: isSelected ? `rgba(${color.rgb}, 0.1)` : 'var(--color-surface)',
                      border: isSelected ? `1px solid rgba(${color.rgb}, 0.5)` : '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        background: color.hex,
                        boxShadow: isSelected ? `0 0 12px rgba(${color.rgb}, 0.7)` : 'none',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    />
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: isSelected ? color.hex : 'var(--color-text-dim)' }}
                    >
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
