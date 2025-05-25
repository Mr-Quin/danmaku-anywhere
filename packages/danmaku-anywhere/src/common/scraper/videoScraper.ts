import { getVideoUrlFromResponse } from '@/common/scraper/cat-catch'
import type { KazumiPolicy } from '@/popup/pages/player/useKazumiPolicies'

export interface SearchResult {
  name: string
  url: string
}

export interface ChapterResult {
  name: string
  url: string
}

const waitForTab = async (tabId: number, timeout = 30000) => {
  const { promise, resolve, reject } = Promise.withResolvers()

  // biome-ignore lint/style/useConst: deferred initialization
  let t: NodeJS.Timeout

  const navListener = (
    details: chrome.webNavigation.WebNavigationFramedCallbackDetails
  ) => {
    if (details.tabId === tabId && details.frameId === 0) {
      resolve(undefined)
      clearTimeout(t)
      chrome.webNavigation.onCompleted.removeListener(navListener)
    }
  }
  chrome.webNavigation.onCompleted.addListener(navListener)

  t = setTimeout(() => {
    chrome.webNavigation.onCompleted.removeListener(navListener)
    reject(new Error('Timeout'))
  }, timeout)

  return promise
}

type CreateTabOptions = {
  tabId?: number
  waitForNavigation?: boolean
}

const createTab = async (
  url: string,
  { tabId, waitForNavigation }: CreateTabOptions = {}
) => {
  // if tabId is given, reused the tab
  if (tabId) {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.id) {
      throw new Error('Failed to update tab')
    }

    await chrome.tabs.update(tabId, { url })

    if (waitForNavigation) {
      await waitForTab(tabId)
    }

    return {
      tab,
      tabId: tab.id,
      closeTab: () => {
        chrome.tabs.remove(tabId)
      },
    }
  }

  const win = await chrome.windows.create({
    state: 'minimized',
  })

  const tab = win.tabs?.at(0)

  if (tab?.id === undefined) {
    throw new Error('Failed to create window')
  }

  await chrome.tabs.update(tab.id, {
    url,
    active: true,
  })

  // const tab = await chrome.tabs.create({
  //   url,
  //   active: false,
  // })

  if (!tab.id) {
    throw new Error('Failed to create tab')
  }

  const _tabId = tab.id

  if (waitForNavigation) {
    await waitForTab(_tabId)
  }

  return {
    tab,
    tabId: _tabId,
    window: win,
    closeTab: async () => {
      await chrome.tabs.remove(_tabId)
    },
  }
}

export const searchContent = async (
  keyword: string,
  policy: KazumiPolicy
): Promise<SearchResult[]> => {
  // Replace @keyword in the search URL with the actual keyword
  const searchUrl = policy.searchURL.replace(
    '@keyword',
    encodeURIComponent(keyword)
  )

  const { tabId, closeTab } = await createTab(searchUrl, {
    waitForNavigation: true,
  })

  const results = await chrome.scripting.executeScript<
    string[],
    SearchResult[]
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
        .filter((result) => result !== null) satisfies SearchResult[]
    },
    args: [policy.searchList, policy.searchName, policy.searchResult],
  })

  await closeTab()

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to search content')
}

export const getChapters = async (
  contentUrl: string,
  policy: KazumiPolicy
): Promise<ChapterResult[][]> => {
  const { tabId, closeTab } = await createTab(contentUrl, {
    waitForNavigation: true,
  })

  const results = await chrome.scripting.executeScript<
    string[],
    ChapterResult[][]
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

      return chapterRoadNodes.map((roadNode) => {
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
          .filter((result) => result !== null) satisfies ChapterResult[]
      })
    },
    args: [policy.chapterRoads, policy.chapterResult],
  })

  await closeTab()

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to get chapters')
}

// Function to extract video URL from a chapter page
export const extractVideoUrl = async (
  chapterUrl: string
): Promise<string[]> => {
  const { tabId, tab, closeTab } = await createTab(chapterUrl)

  const getVideoUrl = async () => {
    const { promise, resolve, reject } = Promise.withResolvers<Set<string>>()

    setTimeout(() => {
      reject(new Error('Timeout'))
    }, 30000)

    const videoUrls = new Set<string>()
    const cleanUpCb: (() => void)[] = []

    const cleanUp = () => {
      cleanUpCb.forEach((cb) => cb())
      cleanUpCb.length = 0
    }

    const handleWebRequest = () => {
      // listen for network requests to get video URLs
      const requestListener = (
        details: chrome.webRequest.WebRequestHeadersDetails
      ) => {
        const url = details.url
        console.log('Found video URL:', url, details)
        // Check if the URL is a video URL (mp4, m3u8, etc.)
        // if (/\.(mp4|m3u8|flv|webm)($|\?)/.test(url)) {
        //   videoUrls.add(url)
        // }
      }

      const responseListener = (
        details: chrome.webRequest.WebResponseHeadersDetails
      ) => {
        const videoUrl = getVideoUrlFromResponse(details)

        if (videoUrl) {
          videoUrls.add(videoUrl)
          resolve(videoUrls)
          cleanUp()
          console.log('Response:', videoUrl)
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

      const tabRemovedListener = (tabId: number) => {
        if (tabId === tab.id) {
          reject(new Error('Tab closed'))
          cleanUp()
        }
      }

      chrome.tabs.onRemoved.addListener(tabRemovedListener)

      cleanUpCb.push(() => {
        chrome.tabs.onRemoved.removeListener(tabRemovedListener)
      })
    }

    handleWebRequest()

    await waitForTab(tabId)

    // const checkForVideo = async () => {
    //   const results = await chrome.scripting.executeScript({
    //     target: { tabId, allFrames: true },
    //     func: () => {
    //       const sources: string[] = []
    //
    //       // biome-ignore lint/suspicious/noExplicitAny: look for variables set by video players
    //       // const w = window as any
    //       // if (w.player_aaaa && w.player_aaaa.url) {
    //       //   videoUrls.add(w.player_aaaa.url)
    //       // }
    //
    //       // Try to find video elements
    //       const videos = document.querySelectorAll('video')
    //
    //       videos.forEach((video) => {
    //         if (video.src && !video.src.startsWith('blob:')) {
    //           videoUrls.add(video.src)
    //         }
    //       })
    //
    //       return sources
    //     },
    //     world: 'MAIN',
    //   })
    //
    //   console.log(results)
    //
    //   return results
    //     .filter((result) => result.result)
    //     .flatMap((result) => result.result)
    // }
    //
    // await checkForVideo()

    console.log('script finished')

    return promise
  }

  const videoUrls = await getVideoUrl()

  await closeTab()

  return Array.from(videoUrls)
}
