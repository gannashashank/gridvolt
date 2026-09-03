/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skyroot: {
          black: '#0A0A0B',
          surface: '#0E0F11',
          card: '#141518',
          cardHover: '#181A1F',
          border: '#22242A',
          borderSubtle: 'rgba(255, 255, 255, 0.07)',
          muted: '#8A8D93',
          accent: '#FF6A00',
          accentHover: '#E05D00',
          accentMuted: 'rgba(255, 106, 0, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        'ultra-wide': '0.25em',
      },
    },
  },
  plugins: [],
}
