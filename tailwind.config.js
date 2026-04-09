/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: ["'Noto Naskh Arabic'", "'Times New Roman'", "serif"],
        cairo:  ["'Cairo'", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        th: {
          text:    'var(--th-text)',
          sub:     'var(--th-text-sub)',
          muted:   'var(--th-text-muted)',
          surface: 'var(--th-surface)',
          alt:     'var(--th-surface-alt)',
          border:  'var(--th-border)',
          baccent: 'var(--th-border-accent)',
          inputbg: 'var(--th-input-bg)',
          inputbd: 'var(--th-input-border)',
          card:    'var(--th-card-bg)',
          modal:   'var(--th-modal-bg)',
          accent:  'var(--th-accent)',
          green:   'var(--th-green)',
          blue:    'var(--th-blue)',
          red:     'var(--th-red)',
          redtext: 'var(--th-red-text)',
        },
        gold:  { DEFAULT: '#f59e0b', dark: '#d97706' },
        navy:  { DEFAULT: '#1a3a5c', light: '#2d5a8e' },
      },
    },
  },
  plugins: [],
}
