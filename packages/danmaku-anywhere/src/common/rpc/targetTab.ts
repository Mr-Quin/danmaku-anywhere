const TARGET_TAB_PARAM = 'tabId'

export function readTargetTabId(search: string): number | undefined {
  const raw = new URLSearchParams(search).get(TARGET_TAB_PARAM)
  if (raw === null || raw === '') {
    return undefined
  }
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 0) {
    return undefined
  }
  return id
}

// A popup page opened in its own window or tab is itself the active tab of
// the current window, so it is told which tab it was opened from instead.
export function getTargetTabId(): number | undefined {
  if (typeof location === 'undefined' || !chrome.runtime?.getURL) {
    return undefined
  }
  if (!location.href.startsWith(chrome.runtime.getURL(''))) {
    return undefined
  }
  return readTargetTabId(location.search)
}

export async function findTargetTab(
  tabId: number | undefined
): Promise<chrome.tabs.Tab | undefined> {
  if (tabId !== undefined) {
    try {
      return await chrome.tabs.get(tabId)
    } catch {
      return undefined
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

export function resolveTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  return findTargetTab(getTargetTabId())
}

export function buildDetachedPopupUrl(path: string, tabId?: number): string {
  const params = new URLSearchParams({ detached: '1' })
  if (tabId !== undefined) {
    params.set(TARGET_TAB_PARAM, String(tabId))
  }
  const route = path.startsWith('/') ? path.slice(1) : path
  return chrome.runtime.getURL(`pages/popup.html?${params}#/${route}`)
}
