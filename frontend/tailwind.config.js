/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8b5e34',
        primaryDark: '#5f3f24',
        cream: '#f7f0e7',
        parchment: '#fffaf3',
        cocoa: '#2f2118',
        taupe: '#806a5a',
        sage: '#667761'
      }
    }
  },
  plugins: []
};
