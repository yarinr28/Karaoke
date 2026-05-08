/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
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
        'active-item': '#2d1f5e',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
