module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--c-a1) / <alpha-value>)',
          2: 'rgb(var(--c-a2) / <alpha-value>)',
        },
        grad: {
          from: 'rgb(var(--c-g1) / <alpha-value>)',
          to: 'rgb(var(--c-g2) / <alpha-value>)',
        },
      }
    }
  },
  plugins: []
};
