'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Mode = 'dark' | 'light';

export interface AccentColor {
  name: string;
  hex: string;
  rgb: string; // "r, g, b"
}

export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Purple',  hex: '#a855f7', rgb: '168, 85, 247'  },
  { name: 'Pink',    hex: '#ec4899', rgb: '236, 72, 153'  },
  { name: 'Blue',    hex: '#3b82f6', rgb: '59, 130, 246'  },
  { name: 'Cyan',    hex: '#06b6d4', rgb: '6, 182, 212'   },
  { name: 'Green',   hex: '#22c55e', rgb: '34, 197, 94'   },
  { name: 'Gold',    hex: '#eab308', rgb: '234, 179, 8'   },
  { name: 'Orange',  hex: '#f97316', rgb: '249, 115, 22'  },
  { name: 'Red',     hex: '#ef4444', rgb: '239, 68, 68'   },
];

interface ThemeContextValue {
  mode: Mode;
  accent: AccentColor;
  setMode: (m: Mode) => void;
  setAccent: (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  accent: ACCENT_COLORS[0],
  setMode: () => {},
  setAccent: () => {},
});

function applyTheme(mode: Mode, accent: AccentColor) {
  const root = document.documentElement;
  root.setAttribute('data-mode', mode);
  root.style.setProperty('--accent', accent.hex);
  root.style.setProperty('--accent-rgb', accent.rgb);

  const dark = mode === 'dark';
  root.style.setProperty('--color-bg',       dark ? '#030308'                  : '#f2f0ff');
  root.style.setProperty('--color-sidebar',   dark ? 'rgba(5,5,12,0.96)'       : 'rgba(238,235,255,0.98)');
  root.style.setProperty('--color-footer',    dark ? 'rgba(3,3,8,0.88)'        : 'rgba(238,235,255,0.94)');
  root.style.setProperty('--color-border',    dark ? 'rgba(255,255,255,0.07)'  : 'rgba(0,0,0,0.1)');
  root.style.setProperty('--color-surface',   dark ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.05)');
  root.style.setProperty('--color-text',      dark ? '#ffffff'                 : '#0d0d1a');
  root.style.setProperty('--color-text-rgb',  dark ? '255, 255, 255'           : '13, 13, 26');
  root.style.setProperty('--color-text-dim',  dark ? 'rgba(255,255,255,0.4)'   : 'rgba(13,13,26,0.45)');
  root.style.setProperty('--modal-bg',        dark ? 'rgba(10,8,20,0.92)'      : 'rgba(245,243,255,0.97)');
  root.style.setProperty('--player-bg1',      `rgba(${accent.rgb},${dark ? '0.22' : '0.12'})`);
  root.style.setProperty('--player-bg2',      `rgba(${accent.rgb},${dark ? '0.08' : '0.04'})`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState]     = useState<Mode>('dark');
  const [accent, setAccentState] = useState<AccentColor>(ACCENT_COLORS[0]);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const savedMode   = (localStorage.getItem('theme-mode') as Mode) || 'dark';
    const savedAccent = ACCENT_COLORS.find(
      (c) => c.hex === localStorage.getItem('theme-accent')
    ) ?? ACCENT_COLORS[0];
    setModeState(savedMode);
    setAccentState(savedAccent);
    applyTheme(savedMode, savedAccent);
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    localStorage.setItem('theme-mode', m);
    applyTheme(m, accent);
  }, [accent]);

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem('theme-accent', a.hex);
    applyTheme(mode, a);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
