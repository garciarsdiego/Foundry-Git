/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d0f',
          secondary: '#16181c',
          tertiary: '#1e2128',
        },
        border: {
          DEFAULT: '#2a2d35',
          subtle: '#1e2128',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
