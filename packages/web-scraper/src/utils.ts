export const Logger = console

const waitForTabNavigation = async (
  tabId: number,
  {
    timeout = 30000,
  }: {
    timeout?: number
  } = {}
) => {
  const { promise, resolve, reject } = Promise.withResolvers()

  const t = setTimeout(() => {
    Logger.debug('Tab navigation timeout', tabId)
    // treat timeout as a success since the content we need might have already loaded
    resolve(undefined)
  }, timeout)

  const cleanupCbs: (() => void)[] = []

  using cleanup = new DisposableStack()

  cleanup.defer(() => {
    cleanupCbs.forEach((cb) => cb())
    cleanupCbs.length = 0
    clearTimeout(t)
  })

  const tabCloseListener = (_tabId: number) => {
    if (_tabId === tabId) {
      Logger.debug('Tab closed!', _tabId)
      reject(new Error('Tab closed'))
    }
  }

  chrome.tabs.onRemoved.addListener(tabCloseListener)

  cleanupCbs.push(() => {
    chrome.tabs.onRemoved.removeListener(tabCloseListener)
  })

  const navListener = (
    details: chrome.webNavigation.WebNavigationFramedCallbackDetails
  ) => {
    if (details.tabId === tabId && details.frameId === 0) {
      if (/chrome:\/\//.test(details.url)) {
        Logger.debug('Ignoring internal tab navigation', details)
        return
      }

      Logger.debug('Tab navigation complete', details)
      resolve(undefined)
    }
  }

  const navErrorListener = (
    details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails
  ) => {
    if (details.tabId === tabId && details.frameId === 0) {
      if (/chrome:\/\//.test(details.url)) {
        // ignore errors that happen in internal pages
        // sometimes errors like "net::ERR_ABORTED" happen in "chrome://new-tab-page/"
        Logger.debug('Ignoring internal navigation error', details)
      } else {
        Logger.debug('Tab navigation error', details)
        reject(new Error(`Tab navigation error: ${details.error}`))
      }
    }
  }

  chrome.webNavigation.onCompleted.addListener(navListener)
  chrome.webNavigation.onErrorOccurred.addListener(navErrorListener)

  cleanupCbs.push(() => {
    chrome.webNavigation.onCompleted.removeListener(navListener)
    chrome.webNavigation.onErrorOccurred.removeListener(navErrorListener)
  })

  // the promise must be awaited here so the cleanup only happens after the promise is resolved
  await promise
}

// poll the tab's url and wait for tab to leave chrome:// url
const waitForTabUpdate = (tabId: number) => {
  const job = createJob(
    async () => {
      const tab = await chrome.tabs.get(tabId)
      if (tab && tab.url) {
        return !/chrome:\/\//.test(tab.url)
      }
      return false
    },
    (result) => result,
    {
      timeout: 10000,
    }
  )

  return job.run()
}

type CreateTabOptions = {
  tabId?: number
  waitForNavigation?: boolean
}

export const createTab = async (
  url: string,
  { tabId, waitForNavigation }: CreateTabOptions = {}
) => {
  const getTab = async () => {
    // if tabId is given, reused the tab
    if (tabId) {
      const tab = await chrome.tabs.update(tabId, { url })
      return {
        tab,
        tabId,
      }
    }

    Logger.debug('Creating window')

    const win = await chrome.windows.create({
      state: 'minimized',
    })

    if (!win.id || !win.tabs || !win.tabs[0].id) {
      throw new Error('Failed to create window')
    }

    const tab = await chrome.tabs.update(win.tabs[0].id, {
      url,
      active: true,
    })

    if (tab?.id === undefined) {
      throw new Error('Failed to create tab')
    }

    return {
      tab,
      tabId: tab.id,
      window: win,
    }
  }

  const { tab, tabId: newTabId, window } = await getTab()

  const cleanUp = async () => {
    try {
      await chrome.tabs.remove(newTabId)
      if (window?.id) {
        // this will throw if the window is already closed, which is fine
        await chrome.windows.remove(window.id)
      }
    } catch (_) {
      // ignore errors
    }
  }

  await waitForTabUpdate(newTabId)

  if (waitForNavigation) {
    try {
      await waitForTabNavigation(newTabId)
    } catch (e) {
      Logger.debug('Failed to wait for navigation', e)
      await cleanUp()
      throw e
    }
  }

  return {
    tab,
    tabId: newTabId,
    async [Symbol.asyncDispose]() {
      Logger.debug('Closing tab', newTabId)
      await cleanUp()
    },
  }
}

interface JobOptions {
  interval?: number
  timeout?: number
}

export function createJob<T>(
  callback: () => Promise<T> | T,
  isSuccess: (result: T) => boolean,
  options: JobOptions = {}
) {
  const { interval = 500, timeout = 30000 } = options

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let intervalId: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    clearTimeout(timeoutId)
    clearTimeout(intervalId)
  }

  const run = () => {
    const { promise, resolve, reject } = Promise.withResolvers<T>()

    // timeout for the entire operation
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`Operation timed out after ${timeout}ms.`))
    }, timeout)

    const execute = async () => {
      // if the promise is already settled, don't do anything.
      let settled = false
      promise
        .catch(() => {
          settled = true
        })
        .then(() => {
          settled = true
        })
      if (settled) return

      try {
        const result = await callback()
        if (isSuccess(result)) {
          cleanup()
          resolve(result)
        } else {
          // schedule the next run
          intervalId = setTimeout(execute, interval)
        }
      } catch (error) {
        cleanup()
        reject(error)
      }
    }

    void execute()

    return promise
  }

  return {
    run,
  }
}
