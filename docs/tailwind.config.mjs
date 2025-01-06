import starlightPlugin from '@astrojs/starlight-tailwind'

const accent = {
  200: '#fdb3a7',
  600: '#a60a00',
  900: '#640300',
  950: '#450c06',
}
const gray = {
  100: '#f8f5f6',
  200: '#f1eced',
  300: '#c6c0c1',
  400: '#94888a',
  500: '#605557',
  700: '#3f3537',
  800: '#2d2426',
  900: '#1b1718',
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: { accent, gray },
    },
  },
  plugins: [starlightPlugin()],
}
