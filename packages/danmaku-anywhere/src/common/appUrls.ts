// Consumed by manifest.ts in the Node build context, so this module must stay
// free of browser and import.meta.env dependencies.
const APP_URLS = [
  'https://danmaku.weeblify.app/*', // prod
  'https://*.quinfish.workers.dev/*', // staging
]

const DEV_APP_URLS = [
  'http://localhost:4200/*', // local dev
]

export function getAppUrls(isDev: boolean): string[] {
  if (isDev) {
    return [...APP_URLS, ...DEV_APP_URLS]
  }
  return APP_URLS
}
