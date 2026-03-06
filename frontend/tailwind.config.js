/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0B0F1A',
        surface: '#111827',
        card:    '#161D2E',
        border:  '#1E2A40',
        amber:   '#F0B429',
        blue:    '#4F8EF7',
        green:   '#10B981',
        red:     '#EF4444',
        muted:   '#5A6A8A',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
