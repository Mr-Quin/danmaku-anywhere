export const isStandaloneRuntime = () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    return true
  }

  return (
    import.meta.env.VITE_STANDALONE === 'true' ||
    import.meta.env.VITE_STANDALONE === true
  )
}
