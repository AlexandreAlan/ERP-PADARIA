import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral palette
        gray: {
          50:  '#FAF6F0',
          100: '#F3EDE3',
          200: '#E8DDD0',
          300: '#D4C9B8',
          400: '#B0A090',
          500: '#8A7A6A',
          600: '#6B5C4E',
          700: '#4E3F34',
          800: '#33261C',
          900: '#1C140D',
          950: '#0E0A06',
        },
        // Primary accent: amber-gold
        brand: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Espresso — sidebar & deep accents
        espresso: {
          50:  '#F9F3EE',
          100: '#EFE0D0',
          200: '#D9BFA4',
          300: '#BE9570',
          400: '#A06B45',
          500: '#7D4E2B',
          600: '#5E3519',
          700: '#412210',
          800: '#2A150A',
          900: '#1A0D06',
          950: '#0D0603',
        },
        // Terracotta — secondary accent
        terra: {
          400: '#E07055',
          500: '#C2512E',
          600: '#A33E1E',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.05)',
        'card-md': '0 2px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.07)',
        'brand':   '0 4px 16px rgba(217,119,6,0.3)',
        'inner':   'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
