/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mist: 'var(--mist)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        sunrise: 'var(--sunrise)',
        collar: 'var(--collar)',
        park: 'var(--park)',
        miss: 'var(--miss)',
        chip: 'var(--chip)',
        wknd: 'var(--wknd)'
      }
    }
  },
  plugins: []
}
