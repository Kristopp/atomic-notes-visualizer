/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ghost-white': '#F8F9FA',
        'surface-glass': 'rgba(255, 255, 255, 0.45)', // 0.45 as per prompt
        'text-primary': '#1A1A1A', // Pure Black
        'text-secondary': '#71717A', // Slate Gray
        'glass-border-light': 'rgba(255, 255, 255, 0.8)',
        'glass-border-dark': 'rgba(255, 255, 255, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        'spatial-gradient': 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
      },
      boxShadow: {
        'spatial-lift': '0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.02)', // Layered depth
        'glass-edge': 'inset 1px 1px 0px 0px rgba(255, 255, 255, 0.8), inset -1px -1px 0px 0px rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'hyper': '32px',
        'bento': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
