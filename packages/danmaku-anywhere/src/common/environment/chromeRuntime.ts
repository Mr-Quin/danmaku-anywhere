const isChromeRuntimeAvailable = () => {
  return typeof chrome !== 'undefined' && !!chrome.runtime
}

export const IS_CHROME_RUNTIME_AVAILABLE = isChromeRuntimeAvailable()

export const connectRuntimePort = (name: string) => {
  if (!IS_CHROME_RUNTIME_AVAILABLE) {
    return null
  }

  return chrome.runtime.connect({ name })
}
