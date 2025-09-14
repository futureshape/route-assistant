/** @type {import('tailwindcss').Config} */
const path = require('path')

module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}')
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}
