import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#EEF3FC",
        card: "#FFFFFF",
        soft: "#E4ECFB",
        blue: "#4C6FF0",
        blueDark: "#3A56C4",
        blueDeep: "#1F2E63",
        ink: "#1B2440",
        muted: "#8C93A8",
        line: "#E3E8F5",
        amber: "#F5A524",
        amberBg: "#FEF3DE",
        green: "#2FBE7E",
        greenBg: "#E4F8EE",
        debt: "#F2555A",
      },
      boxShadow: {
        soft: "0 6px 16px -10px rgba(31, 46, 99, 0.2)",
        card: "0 10px 24px -14px rgba(31, 46, 99, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;