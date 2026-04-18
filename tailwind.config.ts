import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d7570c',
        secondary: '#222222',
        accent: '#2b2b2b',
        dark: '#1b1b1b',
      },
    },
  },
  plugins: [],
}
export default config
