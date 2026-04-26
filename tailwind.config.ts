import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        accent: "#7c5cfc",
        accent2: "#c084fc",
        text: "#f0eeff",
        muted: "#8884aa"
      },
      fontFamily: {
        heading: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,252,0.2), 0 12px 48px rgba(124,92,252,0.22)"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseBar: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        }
      },
      animation: {
        fadeUp: "fadeUp 0.8s ease forwards",
        pulseBar: "pulseBar 1.6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
