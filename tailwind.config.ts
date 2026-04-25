import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1A1A1A',
        muted: '#666666',
        line: '#E5E5E5',
        gold: '#C8A96E',
        deep: '#0A0A0A'
      },
      fontFamily: {
        sans: ['Source Han Sans SC', 'PingFang SC', 'Inter', 'Arial', 'sans-serif'],
        serif: ['Source Han Serif SC', 'Songti SC', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 1px 4px rgba(0,0,0,0.06)'
      }
    }
  },
  plugins: []
};

export default config;
