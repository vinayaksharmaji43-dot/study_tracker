/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0d0714',
          900: '#160b24',
          850: '#1e1030',
          800: '#281540',
          700: '#361d56',
          600: '#482672',
        },
        royal: {
          400: '#d8b4fe',
          500: '#c084fc',
          600: '#a855f7',
          700: '#9333ea',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#ea580c',
        },
        violet: {
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(168, 85, 247, 0.5)',
        'glow-emerald': '0 0 25px -5px rgba(52, 211, 153, 0.45)',
        'glow-gold': '0 0 25px -5px rgba(251, 191, 36, 0.45)',
        'glow-violet': '0 0 25px -5px rgba(168, 85, 247, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
