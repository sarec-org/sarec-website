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
        ink: '#041421',
        muted: '#6E7C88',
        line: '#E8DFD2',
        gold: '#C8A15A',
        deep: '#041421',
        navy: '#071B2C',
        midnight: '#071B2C',
        carbon: '#24384A',
        ivory: '#F7F3EB',
        warm: '#F3EFE6',
        champagne: '#C8A15A',
        softgold: '#D6B56B',
        graphite: '#24384A',
        steel: '#6E7C88'
      },
      fontFamily: {
        sans: ['Source Han Sans SC', 'PingFang SC', 'Inter', 'Arial', 'sans-serif'],
        serif: ['Source Han Serif SC', 'Songti SC', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 1px 4px rgba(0,0,0,0.06)',
        v3: '0 30px 90px rgba(4,20,33,0.16)',
        'v3-card': '0 24px 60px rgba(4,20,33,0.08)'
      },
      keyframes: {
        'v3-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'v3-fade-up': 'v3-fade-up 700ms ease-out both'
      }
    }
  },
  plugins: []
};

export default config;
