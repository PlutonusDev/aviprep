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
            },
            keyframes: {
                flight: {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '25%': { transform: 'translate(20px, -10px) scaleX(0.8) scaleY(1.05)' },
                    '50%': { transform: 'translate(0, 0) scale(1)' },
                    '75%': { transform: 'translate(-20px, 10px) scaleX(0.8) scaleY(1.05)' },
                }
            },
            animation: {
                flight: 'flight 4s ease-in-out infinite',
            }
        }
    },
    plugins: [
        require('@tailwindcss/typography')
    ]
}