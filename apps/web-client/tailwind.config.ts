import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CLEVER dark theme + blue accents (per instructions)
        bg: "#0f172a",
        surface: "#1e293b",
        "surface-2": "#273449",
        border: "#334155",
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          soft: "#1d4ed8",
        },
        muted: "#94a3b8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
