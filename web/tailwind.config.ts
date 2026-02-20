import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#006994",
                    light: "#0087be",
                    dark: "#004d6e",
                },
                secondary: {
                    DEFAULT: "#87A96B",
                    light: "#a4c282",
                    dark: "#6a8754",
                },
                alert: {
                    DEFAULT: "#EC5800",
                    light: "#ff7a2e",
                    dark: "#c44700",
                },
                neutral: {
                    DEFAULT: "#708090",
                    light: "#8d9cac",
                    dark: "#546070",
                },
            },
        },
    },
    plugins: [],
};

export default config;
