/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          hover:    'var(--bg-hover)',
        },
        border: {
          subtle:      'var(--border-subtle)',
          default:     'var(--border-strong)',
          interactive: 'var(--border-strong)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          dim:       'var(--text-dim)',
          faint:     'var(--text-faint)',
        },
        accent: {
          green: '#10b981',
          blue:  '#2563EB',
        },
      },
      fontSize: {
        'xxs':  ['12px', { lineHeight: '17px' }],
        'xs':   ['14px', { lineHeight: '20px' }],
        'sm':   ['15px', { lineHeight: '22px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg':   ['18px', { lineHeight: '27px' }],
        'xl':   ['21px', { lineHeight: '31px' }],
        '2xl':  ['26px', { lineHeight: '36px' }],
        '3xl':  ['32px', { lineHeight: '42px' }],
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px var(--shadow-color)',
        'neo':    '3px 3px 0px var(--shadow-color)',
        'neo-md': '4px 4px 0px var(--shadow-color)',
        'neo-lg': '6px 6px 0px var(--shadow-color)',
      },
    },
  },
  plugins: [],
}
