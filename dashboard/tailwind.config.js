/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface:        '#0a0d12',
        'surface-1':    '#11151c',
        'surface-2':    '#161b24',
        'surface-3':    '#1c2230',
        edge:           '#1e242e',
        'edge-bright':  '#2a3240',
        fg:             '#e8e3d8',
        'fg-dim':       '#9ca3af',
        'fg-muted':     '#6b7280',
        accent:         '#f97316',
        'accent-bright':'#fb923c',
        'accent-dim':   '#9a4a1f',
        data:           '#38bdf8',
        'data-bright':  '#7dd3fc',
        ok:             '#4ade80',
        warn:           '#fbbf24',
        err:            '#ef4444',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'ui-serif', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest2: '0.18em',
      },
      animation: {
        'ticker':     'ticker 60s linear infinite',
        'pulse-dot':  'pulse-dot 1.6s ease-in-out infinite',
        'fade-in':    'fade-in 0.5s ease-out both',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.85)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}