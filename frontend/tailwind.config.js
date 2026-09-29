/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0f17',
        panel: '#131823',
        'panel-2': '#1a202e',
        'panel-hover': '#21293a',
        border: '#252d3d',
        'border-focus': '#3b4860',
        'text-bright': '#ffffff',
        'text-main': '#e5e9f2',
        muted: '#848fa5',
        'muted-2': '#556075',
        research: {
          DEFAULT: '#5fa8ff',
          soft: 'rgba(95, 168, 255, 0.16)',
        },
        analyst: {
          DEFAULT: '#e8b355',
          soft: 'rgba(232, 179, 85, 0.16)',
        },
        critic: {
          DEFAULT: '#e8637a',
          soft: 'rgba(232, 99, 122, 0.16)',
        },
        tier1: {
          DEFAULT: '#38d39f',
          soft: 'rgba(56, 211, 159, 0.15)',
        },
        tier2: {
          DEFAULT: '#60a5fa',
          soft: 'rgba(96, 165, 250, 0.15)',
        },
        tier3: {
          DEFAULT: '#c084fc',
          soft: 'rgba(192, 132, 252, 0.15)',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 20px -5px rgba(56, 211, 159, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.35s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
