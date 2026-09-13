import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2E2A20",
        paper: "#F7F4EE",
        card: "#FFFFFF",
        line: "#E4DDCC",
        muted: "#8A8270",
        debt: "#B0512F",
      },
    },
  },
  plugins: [],
};
export default config;
