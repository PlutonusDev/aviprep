const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./app/**/*.{ts,tsx}"
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px"
            }
        },
        extend: {
            screens: {
                'standalone': { 'raw': '(display-mode: standalone)' },
            }
        }
    },
    plugins: [
        require('@tailwindcss/typography')
    ]
}