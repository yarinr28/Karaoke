import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d1a',
        sidebar: '#111125',
        player: '#09090f',
        accent: '#7c3aed',
        'accent-bright': '#a855f7',
        'accent-dim': '#4c1d95',
        surface: '#1a1a35',
        border: '#1e1e3a',
        'text-dim': '#64748b',
        'active-bg': '#2d1f5e',
      },
    },
  },
  plugins: [],
};

export default config;
