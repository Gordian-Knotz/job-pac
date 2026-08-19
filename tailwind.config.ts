import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PAC Africa brand system.
        pac: {
          // Orange stays the single accent. `orange` is for borders, icons,
          // large text and the stamp; `orange-dark` is the only one that may
          // carry white text at body size — #E8532E on white is 3.68:1, which
          // fails AA for normal text, while #C9401F is 4.93:1 and passes.
          orange: "#E8532E",
          "orange-dark": "#C9401F",
          "orange-tint": "#FDF0EC",

          ink: "#161412",
          paper: "#FDFBF8",
          stone: "#F4F1EC",
          line: "#E4DFD6",

          // Secondary text. Darkened from #8A8378, which was 3.46:1 on paper
          // and failed AA everywhere it was used for body copy. #6B655C is
          // 5.29:1. The old value survives as `faint`, for non-text use only.
          muted: "#6B655C",
          faint: "#8A8378",
        },
      },
      fontFamily: {
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        body: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      // The markup throughout uses font-600 / font-700. Tailwind 3.4 ships only
      // named weights, so those classes silently did nothing and every heading
      // rendered at normal weight. Registering the numerics fixes it without
      // touching any markup.
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      letterSpacing: {
        // Tracking is size-specific: large type reads too loose as it grows,
        // small type needs a little air. One global value is wrong somewhere.
        display: "-0.021em",
        tight: "-0.011em",
        label: "0.14em",
      },
      borderRadius: {
        card: "6px",
      },
      boxShadow: {
        stamp: "0 1px 2px rgba(22, 20, 18, 0.06), 0 1px 0 rgba(22, 20, 18, 0.04)",
        // Larger surfaces read as thicker than small chips.
        raised: "0 4px 16px -4px rgba(22, 20, 18, 0.10), 0 1px 2px rgba(22, 20, 18, 0.05)",
      },
      transitionTimingFunction: {
        // The built-in CSS easings are too weak to feel intentional.
        // Never ease-in on UI: it delays the first frame, which is exactly
        // when the user is watching.
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      keyframes: {
        "pane-in": {
          from: { opacity: "0", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pane-in": "pane-in 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
