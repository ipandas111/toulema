/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#F5F5F7',
        surface: '#FFFFFF',
        card:    '#FFFFFF',
        border:  '#D2D2D7',
        amber:   '#FF9F0A',
        blue:    '#0071E3',
        green:   '#1D9E5F',
        red:     '#D93025',
        muted:   '#86868B',
        'muted-2': '#AEAEB2',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl2': '14px',
        'xl3': '18px',
      },
    },
  },
  plugins: [],
}
