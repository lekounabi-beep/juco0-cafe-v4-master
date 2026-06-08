/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "oklch(0.16 0.02 50)",
        foreground: "oklch(0.99 0 0)",
        card: "oklch(0.18 0.02 50 / 0.55)",
        "card-foreground": "oklch(0.99 0 0)",
        popover: "oklch(0.18 0.02 50)",
        "popover-foreground": "oklch(0.99 0 0)",
        primary: "oklch(0.92 0.21 102)",
        "primary-foreground": "oklch(0.18 0.02 50)",
        secondary: "oklch(0.25 0.02 50 / 0.6)",
        "secondary-foreground": "oklch(0.99 0 0)",
        muted: "oklch(0.25 0.02 50 / 0.5)",
        "muted-foreground": "oklch(0.80 0.02 80)",
        accent: "oklch(0.30 0.05 80 / 0.6)",
        "accent-foreground": "oklch(0.99 0 0)",
        destructive: "oklch(0.6 0.22 27)",
        "destructive-foreground": "oklch(0.99 0 0)",
        border: "oklch(1 0 0 / 0.12)",
        input: "oklch(1 0 0 / 0.15)",
        ring: "oklch(0.92 0.21 102)",
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "calc(1rem - 4px)",
        md: "calc(1rem - 2px)",
        lg: "1rem",
        xl: "calc(1rem + 4px)",
        "2xl": "calc(1rem + 8px)",
        "3xl": "calc(1rem + 12px)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.25), 0 12px 40px rgba(0,0,0,0.35)",
        glow: "0 14px 50px -8px color-mix(in oklab, oklch(0.92 0.21 102) 60%, transparent)",
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        pop: "pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
      },
      keyframes: {
        "fade-up": {
          from: {
            opacity: "0",
            transform: "translateY(14px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        pop: {
          "0%": {
            transform: "scale(0.6) rotate(-10deg)",
            opacity: "0",
          },
          "60%": {
            transform: "scale(1.15) rotate(4deg)",
          },
          "100%": {
            transform: "scale(1) rotate(0)",
            opacity: "1",
          },
        },
      },
    },
  },
  plugins: [],
};
