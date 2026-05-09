import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg:      '#030308',
        sidebar: '#07070f',
        player:  '#030308',
        // Neon green — play / active states
        neon:        '#00ff87',
        'neon-dim':  'rgba(0,255,135,0.1)',
        // Electric blue — progress / seek
        electric:        '#00b4ff',
        'electric-dim':  'rgba(0,180,255,0.1)',
        // Purple — general accent
        accent:         '#9333ea',
        'accent-bright': '#a855f7',
        'accent-dim':    'rgba(147,51,234,0.18)',
        // Glass surfaces
        surface:         'rgba(255,255,255,0.04)',
        'surface-hover': 'rgba(255,255,255,0.07)',
        border:          'rgba(255,255,255,0.07)',
        'border-bright': 'rgba(255,255,255,0.14)',
        // Active row
        'active-bg': 'rgba(0,255,135,0.07)',
        // Muted text
        'text-dim': 'rgba(255,255,255,0.4)',
      },
      keyframes: {
        'ambient-shift': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        'glow-word': {
          '0%,100%': { textShadow: '0 0 18px rgba(168,85,247,0.85), 0 0 40px rgba(168,85,247,0.4)' },
          '50%':     { textShadow: '0 0 30px rgba(168,85,247,1),    0 0 60px rgba(168,85,247,0.65), 0 0 90px rgba(168,85,247,0.2)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          to:   { opacity: '1', transform: 'scale(1)    translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        ambient:    'ambient-shift 20s ease infinite',
        glow:       'glow-word 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.24s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':  'fade-in 0.2s ease',
        float:      'float 4s ease-in-out infinite',
        'spin-slow':'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
