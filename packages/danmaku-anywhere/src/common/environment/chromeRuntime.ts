export const isChromeRuntimeAvailable = () => {
  return typeof chrome !== 'undefined' && !!chrome.runtime
}

export const getExtensionVersion = () => {
  if (isChromeRuntimeAvailable()) {
    return chrome.runtime.getManifest().version
  }

  return import.meta.env.VERSION ?? 'standalone'
}

export const connectRuntimePort = (name: string) => {
  if (!isChromeRuntimeAvailable()) {
    return null
  }

  return chrome.runtime.connect({ name })
}
