/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'app-dark': '#1E1E1E',
        'app-darker': '#121212',
        'app-light': '#FFFFFF',
        'app-accent': '#4F46E5',
      },
    },
  },
  plugins: [],
}