function isStandaloneRuntime(): boolean {
  if (import.meta.env.VITE_STANDALONE === 'true') {
    return true
  }
  return typeof chrome === 'undefined' || !chrome.runtime
}

export const IS_STANDALONE_RUNTIME = isStandaloneRuntime()
