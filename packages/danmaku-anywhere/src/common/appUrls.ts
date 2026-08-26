// Consumed by manifest.ts in the Node build context, so this module must stay
// free of browser and import.meta.env dependencies.
const APP_URLS = [
  'https://danmaku.weeblify.app/*', // prod
  'https://*.quinfish.workers.dev/*', // staging
]

const DEV_APP_URLS = [
  'http://localhost:4200/*', // local dev
]

// Sites allowed to reach the background RPC server through
// chrome.runtime.onMessageExternal. https only: a `*://` scheme wildcard would
// let a network attacker on the plaintext leg drive the extension.
const EXTERNALLY_CONNECTABLE_URLS = ['https://danmaku.weeblify.app/*']

const DEV_EXTERNALLY_CONNECTABLE_URLS = [
  'http://localhost:4321/*', // local docs site
]

export function getAppUrls(isDev: boolean): string[] {
  if (isDev) {
    return [...APP_URLS, ...DEV_APP_URLS]
  }
  return APP_URLS
}

export function getExternallyConnectablePatterns(isDev: boolean): string[] {
  if (isDev) {
    return [...EXTERNALLY_CONNECTABLE_URLS, ...DEV_EXTERNALLY_CONNECTABLE_URLS]
  }
  return EXTERNALLY_CONNECTABLE_URLS
}
