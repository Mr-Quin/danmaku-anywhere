export function getBuildContext(): {
  browser: {
    name: string
    isChrome: boolean
    isFirefox: boolean
  }
  appVersion: string
  isDev: boolean
}
