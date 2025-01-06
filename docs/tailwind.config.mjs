import starlightPlugin from '@astrojs/starlight-tailwind'
import daisyui from 'daisyui'
import daisyTheme from 'daisyui/src/theming/themes'

const accent = {
  50: '#fde6d9',
  100: '#fdd0c1',
  200: '#fdb3a7',
  300: '#fca08d',
  400: '#fb8e73',
  500: '#fa7b59',
  600: '#a60a00',
  700: '#7d0800',
  800: '#6b0700',
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
  daisyui: {
    themes: [
      {
        dark: {
          ...daisyTheme.dark,
          primary: accent[200],
          secondary: accent[300],
          accent: accent[600],
          neutral: gray[700],
          'base-100': gray[800],
        },
      },
      {
        light: {
          ...daisyTheme.light,
          primary: accent[600],
          secondary: accent[500],
          accent: accent[200],
          neutral: gray[500],
          'base-100': gray[100],
        },
      },
    ],
  },
  plugins: [starlightPlugin(), daisyui],
}
