/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aurora: {
          violet: '#d0bcff',
          blue: '#ccc2dc',
          cyan: '#e8def8',
          pink: '#efb8c8',
          indigo: '#cac4d0',
        },
        ink: {
          950: '#0e0c12',
          900: '#141218',
          800: '#1d1b20',
        },
        surface: {
          DEFAULT: '#141218',
          low: '#1d1b20',
          high: '#2b2930',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 4px 16px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 40px rgba(0, 0, 0, 0.45)',
        glow: '0 0 0 1px var(--md-outline-variant)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        breathe: 'breathe 2.4s ease-in-out infinite',
        float: 'float 8s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};