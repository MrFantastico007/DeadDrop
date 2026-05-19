/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chamber-black': '#0B0B0F',
        'chamber-navy': '#111827',
        'chamber-gold': '#D4AF37',
        'chamber-white': '#F5F5F5',
        'chamber-glow': '#FFD66B',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 15px 2px rgba(212, 175, 55, 0.4)',
        'glow-gold-lg': '0 0 25px 4px rgba(255, 214, 107, 0.6)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'tactical-grid': 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
