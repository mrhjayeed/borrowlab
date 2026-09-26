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
        canvas: '#F8FAFC',
        surface: {
          DEFAULT: '#FFFFFF',
          dim: '#F1F5F9',
          card: '#FFFFFF',
        },
        hairline: {
          DEFAULT: '#E2E8F0',
          subtle: '#F1F5F9',
          strong: '#CBD5E1',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5', // Primary accent
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        escrow: {
          DEFAULT: '#06B6D4', // Cyan accent
          tint: '#ECFEFF',
          stroke: '#A5F3FC',
          text: '#0E7490',
        },
        hardware: {
          available: {
            DEFAULT: '#10B981',
            tint: '#ECFDF5',
            stroke: '#A7F3D0',
            text: '#047857',
          },
          reserved: {
            DEFAULT: '#F59E0B',
            tint: '#FFFBEB',
            stroke: '#FDE68A',
            text: '#B45309',
          },
          fault: {
            DEFAULT: '#EF4444',
            tint: '#FEF2F2',
            stroke: '#FECACA',
            text: '#B91C1C',
          },
        },
        slate: {
          850: '#151F32',
          950: '#090D16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'level-1': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'level-2': '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -2px rgba(15, 23, 42, 0.03)',
        'level-3': '0 16px 32px -4px rgba(15, 23, 42, 0.08), 0 6px 16px -3px rgba(15, 23, 42, 0.03)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
      },
      borderRadius: {
        'instrument': '8px',
      },
    },
  },
  plugins: [],
}
