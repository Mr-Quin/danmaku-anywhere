import { Logger } from '@/common/Logger'
import type { KazumiPolicy } from '@/common/options/kazumiPolicy/schema'
import { getVideoUrlFromResponse } from '@/popup/pages/player/scraper/cat-catch'

export interface KazumiSearchResult {
  name: string
  url: string
}

export interface KazumiChapterResult {
  name: string
  url: string
}

const waitForTab = async (
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
        Logger.debug('Tab navigated to internal page, ignoring', details)
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
      Logger.debug('Tab navigation error', details)
      reject(new Error(`Tab navigation error: ${details.error}`))
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

type CreateTabOptions = {
  tabId?: number
  waitForNavigation?: boolean
}

const createTab = async (
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

  if (waitForNavigation) {
    try {
      await waitForTab(newTabId)
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

export const searchContent = async (
  keyword: string,
  policy: KazumiPolicy
): Promise<KazumiSearchResult[]> => {
  // Replace @keyword in the search URL with the actual keyword
  const searchUrl = policy.searchURL.replace(
    '@keyword',
    encodeURIComponent(keyword)
  )

  await using tabResource = await createTab(searchUrl, {
    waitForNavigation: true,
  })

  const { tabId } = tabResource

  Logger.debug('Looking for search results in page', searchUrl)

  const results = await chrome.scripting.executeScript<
    string[],
    KazumiSearchResult[]
  >({
    target: { tabId },
    func: (searchList, searchName, searchResult) => {
      // helper functions must be inlined in the function body
      const evaluateXPath = (
        xpath: string,
        contextNode: Node = document
      ): Node[] => {
        const result = document.evaluate(
          xpath,
          contextNode,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )

        const nodes: Node[] = []
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i)
          if (node) {
            nodes.push(node)
          }
        }

        return nodes
      }

      const evaluateXpathSingle = (
        path: string,
        parent: Node = window.document
      ) => {
        try {
          return document.evaluate(
            path,
            parent,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue
        } catch {
          return null
        }
      }

      const searchListNodes = evaluateXPath(searchList)

      return searchListNodes
        .map((listNode) => {
          // prepend "." to match from the current node instead of document root
          const nameNode = evaluateXpathSingle(`.${searchName}`, listNode)
          const resultNode = evaluateXpathSingle(`.${searchResult}`, listNode)

          const name = nameNode?.textContent?.trim() || ''
          const url =
            resultNode instanceof HTMLAnchorElement ? resultNode.href : ''

          if (!name || !url) {
            return null
          }
          return { name, url }
        })
        .filter((result) => result !== null) satisfies KazumiSearchResult[]
    },
    args: [policy.searchList, policy.searchName, policy.searchResult],
  })

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to search content')
}

export const getChapters = async (
  contentUrl: string,
  policy: KazumiPolicy
): Promise<KazumiChapterResult[][]> => {
  await using tabResource = await createTab(contentUrl, {
    waitForNavigation: true,
  })

  const { tabId } = tabResource

  Logger.debug('Looking for play lists in page', contentUrl)

  const results = await chrome.scripting.executeScript<
    string[],
    KazumiChapterResult[][]
  >({
    target: { tabId },
    func: (chapterRoads, chapterResult) => {
      // helper functions must be inlined in the function body
      const evaluateXPath = (
        xpath: string,
        contextNode: Node = document
      ): Node[] => {
        const result = document.evaluate(
          xpath,
          contextNode,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )

        const nodes: Node[] = []
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i)
          if (node) {
            nodes.push(node)
          }
        }

        return nodes
      }

      const chapterRoadNodes = evaluateXPath(chapterRoads)

      return chapterRoadNodes
        .map((roadNode) => {
          const chapterNodes = evaluateXPath(`.${chapterResult}`, roadNode)

          return chapterNodes
            .map((chapterNode) => {
              const name = chapterNode.textContent?.trim() || ''
              const url =
                chapterNode instanceof HTMLAnchorElement ? chapterNode.href : ''

              if (!name || !url) {
                return null
              }
              return {
                name,
                url,
              }
            })
            .filter((result) => result !== null) satisfies KazumiChapterResult[]
        })
        .filter((playList) => playList.length > 0)
    },
    args: [policy.chapterRoads, policy.chapterResult],
  })

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('No chapters found')
}

type VideoInfo = {
  src: string
  type: string
}

// Function to extract video URL from a chapter page
export const extractVideoUrl = async (
  chapterUrl: string
): Promise<VideoInfo[]> => {
  await using tabResource = await createTab(chapterUrl, {
    waitForNavigation: false,
  })

  const { tabId } = tabResource

  Logger.debug('Looking for video URL in page', chapterUrl)

  const getVideoUrlFromNetRequest = async () => {
    const { promise, resolve, reject } = Promise.withResolvers<Set<VideoInfo>>()

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'))
    }, 30000)

    const videoInfos = new Set<VideoInfo>()
    const cleanUpCb: (() => void)[] = []

    using cleanup = new DisposableStack()

    cleanup.defer(() => {
      clearTimeout(timeout)
      cleanUpCb.forEach((cb) => cb())
      cleanUpCb.length = 0
    })

    /**
     * listen for network requests to get video URLs
     */
    const requestListener = (
      details: chrome.webRequest.WebRequestHeadersDetails
    ) => {
      const _ = details.url
      // maybe we need the request headers later
    }

    const responseListener = (
      details: chrome.webRequest.WebResponseHeadersDetails
    ) => {
      const videoInfo = getVideoUrlFromResponse(details)

      if (videoInfo) {
        Logger.debug('Found video URL from response:', videoInfo, details)
        videoInfos.add(videoInfo)
        resolve(videoInfos)
      }
    }

    chrome.webRequest.onSendHeaders.addListener(
      requestListener,
      { tabId, urls: ['<all_urls>'] },
      ['requestHeaders']
    )

    chrome.webRequest.onResponseStarted.addListener(
      responseListener,
      {
        tabId,
        urls: ['<all_urls>'],
      },
      ['responseHeaders']
    )

    cleanUpCb.push(() => {
      chrome.webRequest.onSendHeaders.removeListener(requestListener)
      chrome.webRequest.onResponseStarted.removeListener(responseListener)
    })

    const tabRemovedListener = (_tabId: number) => {
      if (_tabId === tabId) {
        reject(new Error('Tab closed'))
      }
    }

    chrome.tabs.onRemoved.addListener(tabRemovedListener)

    cleanUpCb.push(() => {
      chrome.tabs.onRemoved.removeListener(tabRemovedListener)
    })

    // TODO: inject a content script to look for video URLs in the page
    await promise

    if (videoInfos.size === 0) {
      throw new Error('No video URLs found')
    }

    return videoInfos
  }

  const videoUrls = await getVideoUrlFromNetRequest()

  return Array.from(videoUrls)
}
