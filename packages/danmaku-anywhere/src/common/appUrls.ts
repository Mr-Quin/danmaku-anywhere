// Consumed by manifest.ts at build time, so this module must stay free of
// browser and import.meta.env dependencies.
export const APP_URLS = [
  'https://danmaku.weeblify.app/*', // prod
  'https://*.quinfish.workers.dev/*', // staging
  'http://localhost:4200/*', // local dev
]
