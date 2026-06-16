import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette inspirée de THECLEVEREST Consulting (tcc-sarl.com) :
        // base bleu nuit profond #0d141a + accent sarcelle (teal) #2a9d8f.
        bg: "#0d141a",
        surface: "#152028",
        "surface-2": "#1e2c36",
        border: "#2a3a45",
        primary: {
          DEFAULT: "#2a9d8f",
          hover: "#249284",
          soft: "#1d7a6e",
        },
        muted: "#8d9ba6",
      },
      fontFamily: {
        sans: ["Open Sans", "system-ui", "sans-serif"],
        heading: ["Lato", "Open Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
