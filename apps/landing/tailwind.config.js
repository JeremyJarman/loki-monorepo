/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#122220',
          dark: '#0E1A18',
          light: '#1A2E2C',
        },
        secondary: {
          DEFAULT: '#FF3D00',
          dark: '#CC2F00',
          light: '#FF6B33',
        },
        accent: {
          DEFAULT: '#485C11',
          dark: '#3A4A0E',
          light: '#5A6E15',
        },
        neutral: {
          light: '#F5F5F5',
          DEFAULT: '#333333',
        },
        text: {
          paragraph: '#6F6F6F',
        },
      },
      fontFamily: {
        heading: ['Crimson Text', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
