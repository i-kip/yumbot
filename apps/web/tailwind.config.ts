import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#080e1a', card: '#0f1825', elevated: '#162033', border: 'rgba(255,255,255,0.07)' },
        accent: { blue: '#2563eb', 'blue-light': '#3b82f6', 'blue-dim': 'rgba(37,99,235,0.15)' },
        status: {
          active: '#22c55e', 'active-bg': 'rgba(34,197,94,0.12)',
          inactive: '#ef4444', 'inactive-bg': 'rgba(239,68,68,0.12)',
          warning: '#f59e0b', 'warning-bg': 'rgba(245,158,11,0.12)',
        },
        text: { primary: '#f0f4f8', secondary: '#8b9aaa', muted: '#4a5568' },
      },
      borderRadius: { card: '16px', badge: '8px', btn: '12px' },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
