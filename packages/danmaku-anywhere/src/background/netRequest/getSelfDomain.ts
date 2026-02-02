export function getSelfDomain() {
  const url = chrome.runtime.getURL('')
  try {
    return new URL(url).host
  } catch {
    return chrome.runtime.id
  }
}
