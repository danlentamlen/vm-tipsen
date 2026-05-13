import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simulerar webbläsar-DOM — krävs för React-komponenter
    environment: 'jsdom',

    // Kör setup-fil före varje test (lägger till @testing-library/jest-dom-matchers)
    setupFiles: ['./tests/setup.js'],

    // Testtäckning — kör med: npm test -- --coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/**/*.{js,jsx}',
        'Netlify/functions/**/*.js',
      ],
      exclude: [
        'src/main.jsx',
        'Netlify/functions/_sheets.js',
        'Netlify/functions/_mail.js',
      ],
    },

    // Glob-mönster för testfiler
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
