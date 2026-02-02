export function getSelfDomain() {
  const url = chrome.runtime.getURL('')
  try {
    return new URL(url).host
  } catch (e) {
    console.error('Failed to get self domain', e)
    return chrome.runtime.id
  }
}
