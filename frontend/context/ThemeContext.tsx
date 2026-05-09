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
