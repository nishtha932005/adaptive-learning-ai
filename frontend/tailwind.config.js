/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--primary-r) var(--primary-g) var(--primary-b) / <alpha-value>)",
        background: "rgb(var(--bg-color) / <alpha-value>)",
        card: "rgb(var(--card-color) / <alpha-value>)",
        nebula: {
          bg: "#0B0F19",
          "violet": "#8b5cf6",
          "cyan": "#22d3ee",
          "emerald": "#34d399",
        },
        "dark-bg": "#020617", // slate-950
        "card-glass": "rgba(15, 23, 42, 0.6)",
        "neon-blue": "#38bdf8",
        "neon-purple": "#a855f7",
      },
      boxShadow: {
        "primary-glow": "0 0 20px rgba(139, 92, 246, 0.5)",
        "success-glow": "0 0 20px rgba(52, 211, 153, 0.5)",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(139, 92, 246, 0.0)" },
          "50%": { boxShadow: "0 0 28px rgba(34, 211, 238, 0.18)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
    },
  },
  plugins: [],
};


