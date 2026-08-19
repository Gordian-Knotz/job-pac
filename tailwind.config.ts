import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PAC Africa brand system
        pac: {
          orange: "#E8532E",
          "orange-dark": "#C9401F",
          ink: "#161412",
          paper: "#FDFBF8",
          stone: "#F4F1EC",
          line: "#E4DFD6",
          muted: "#8A8378",
        },
      },
      fontFamily: {
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        body: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      // The markup throughout this app uses font-600 / font-700. Tailwind 3.4
      // ships only named weights (font-semibold, font-bold), so those classes
      // silently produced nothing and every heading rendered at normal weight.
      // Registering the numeric keys fixes it without touching any markup.
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      borderRadius: {
        card: "6px",
      },
      boxShadow: {
        stamp: "0 1px 2px rgba(22, 20, 18, 0.06), 0 1px 0 rgba(22, 20, 18, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
