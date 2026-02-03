import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WCAG AAA Compliant Color Palette - TEAL/CYAN THEME
        primary: {
          DEFAULT: '#00CEC9', // Teal/cyan from reference image
          dark: '#009B96',    // Darker teal
          light: '#5EDDD8',   // Lighter teal for hover
          50: '#E6FFFE',
          100: '#CCFFFC',
          200: '#99FFF9',
          300: '#66FFF6',
          400: '#33FFF3',
          500: '#00CEC9',
          600: '#00A59F',
          700: '#007C77',
          800: '#005250',
          900: '#002928',
        },
        success: {
          DEFAULT: '#006600', // 7.58:1 contrast ratio
          dark: '#004400',
          light: '#008800',
          50: '#E6F7E6',
          100: '#CCEECC',
          200: '#99DD99',
          300: '#66CC66',
          400: '#33BB33',
          500: '#006600',
          600: '#005200',
          700: '#003D00',
          800: '#002900',
          900: '#001400',
        },
        warning: {
          DEFAULT: '#CC6600', // 4.52:1 contrast (large text only)
          dark: '#994D00',
          light: '#FF8000',
          50: '#FFF4E6',
          100: '#FFE9CC',
          200: '#FFD399',
          300: '#FFBD66',
          400: '#FFA733',
          500: '#CC6600',
          600: '#A35200',
          700: '#7A3D00',
          800: '#522900',
          900: '#291400',
        },
        danger: {
          DEFAULT: '#CC0000', // 5.9:1 contrast ratio
          dark: '#990000',
          light: '#FF0000',
          50: '#FFE6E6',
          100: '#FFCCCC',
          200: '#FF9999',
          300: '#FF6666',
          400: '#FF3333',
          500: '#CC0000',
          600: '#A30000',
          700: '#7A0000',
          800: '#520000',
          900: '#290000',
        },
        info: {
          DEFAULT: '#004080', // 8.59:1 contrast ratio
          dark: '#003060',
          light: '#0052A3',
        },
        text: {
          primary: '#000000',   // 21:1 contrast (maximum)
          secondary: '#333333', // 12.63:1 contrast
          tertiary: '#666666',  // 5.74:1 (large text only)
          disabled: '#999999',  // 2.85:1 (disabled state)
        },
        bg: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#E8E8E8',
          hover: '#F0F0F0',
        },
        border: {
          DEFAULT: '#CCCCCC',
          focus: '#0066CC',
          error: '#CC0000',
        },
      },
      fontSize: {
        // Executive-friendly typography
        xs: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        sm: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        base: ['18px', { lineHeight: '28px', fontWeight: '400' }],  // Body text minimum
        lg: ['20px', { lineHeight: '30px', fontWeight: '400' }],
        xl: ['24px', { lineHeight: '32px', fontWeight: '600' }],    // Headings
        '2xl': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        '3xl': ['48px', { lineHeight: '56px', fontWeight: '700' }], // KPI values
        '4xl': ['64px', { lineHeight: '72px', fontWeight: '700' }],
      },
      spacing: {
        // 8px grid system
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
        '2xl': '64px',
        '3xl': '96px',
      },
      fontWeight: {
        normal: '400',
        medium: '600',
        bold: '700',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
