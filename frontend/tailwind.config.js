/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        midnight: '#0d1117',
        charcoal: '#1c2128',
        sapphire: {
          DEFAULT: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
        },
        'amber-gate': {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-fast': 'spin 0.6s linear infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'grid-drift': 'gridDrift 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        gridDrift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(60px)' },
        },
      },
      boxShadow: {
        'glow-sapphire': '0 0 40px rgba(37, 99, 235, 0.25), 0 0 80px rgba(37, 99, 235, 0.1)',
        'glow-sapphire-sm': '0 0 20px rgba(37, 99, 235, 0.2)',
      },
    },
  },
  plugins: [],
}
