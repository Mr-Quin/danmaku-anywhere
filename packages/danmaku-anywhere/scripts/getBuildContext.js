import packageJson from '../package.json' with { type: 'json' }

const VERSION_SUFFIX = process.env.VERSION_SUFFIX
const BROWSER = process.env.VITE_TARGET_BROWSER ?? 'chrome'
const dev = process.env.NODE_ENV === 'development'
const IS_CHROME = BROWSER === 'chrome'
const IS_FIREFOX = BROWSER === 'firefox'

function getVersion() {
  if (!VERSION_SUFFIX) {
    return packageJson.version
  }
  return packageJson.version + `.${VERSION_SUFFIX}`
}

export function getBuildContext() {
  return {
    browser: {
      name: BROWSER,
      isChrome: IS_CHROME,
      isFirefox: IS_FIREFOX,
    },
    appVersion: getVersion(),
    isDev: dev,
  }
}
