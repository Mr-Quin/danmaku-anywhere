import type { VideoScraperPolicy } from '../options/videoScraperPolicy/schema'

export interface SearchResult {
  name: string
  url: string
}

export interface ChapterResult {
  name: string
  url: string
}

const waitForTab = async (tabId: number) => {
  const { promise, resolve } = Promise.withResolvers()

  const navListener = (
    details: chrome.webNavigation.WebNavigationFramedCallbackDetails
  ) => {
    if (details.tabId === tabId && details.frameId === 0) {
      resolve(undefined)
      chrome.webNavigation.onCompleted.removeListener(navListener)
    }
  }
  chrome.webNavigation.onCompleted.addListener(navListener)

  return promise
}

export const searchContent = async (
  policy: VideoScraperPolicy,
  keyword: string
): Promise<SearchResult[]> => {
  // Replace @keyword in the search URL with the actual keyword
  const searchUrl = policy.searchURL.replace(
    '@keyword',
    encodeURIComponent(keyword)
  )

  const tab = await chrome.tabs.create({
    url: searchUrl,
    active: false,
  })

  if (!tab.id) {
    throw new Error('Failed to create tab')
  }

  const tabId = tab.id

  await waitForTab(tabId)

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

      const results: { name: string; url: string }[] = []

      searchListNodes.forEach((listNode) => {
        // prepend "." to match from the current node instead of document root
        const nameNode = evaluateXpathSingle(`.${searchName}`, listNode)
        const resultNode = evaluateXpathSingle(`.${searchResult}`, listNode)

        const name = nameNode?.textContent?.trim() || ''
        const url =
          resultNode instanceof HTMLAnchorElement ? resultNode.href : ''

        results.push({ name, url })
      })

      return results
    },
    args: [policy.searchList, policy.searchName, policy.searchResult],
  })

  await chrome.tabs.remove(tabId)

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to search content')
}

export const getChapters = async (
  policy: VideoScraperPolicy,
  contentUrl: string
): Promise<ChapterResult[][]> => {
  const tab = await chrome.tabs.create({
    url: contentUrl,
    active: false,
  })

  if (!tab.id) {
    throw new Error('Failed to create tab')
  }

  const tabId = tab.id

  await waitForTab(tabId)

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

        return chapterNodes.map((chapterNode) => {
          const name = chapterNode.textContent?.trim() || ''
          const url =
            chapterNode instanceof HTMLAnchorElement ? chapterNode.href : ''

          return {
            name,
            url,
          }
        })
      })
    },
    args: [policy.chapterRoads, policy.chapterResult],
  })

  await chrome.tabs.remove(tabId)

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to get chapters')
}

// Function to extract video URL from a chapter page
export const extractVideoUrl = async (
  policy: VideoScraperPolicy,
  chapterUrl: string
): Promise<string> => {
  // Create a tab to load the chapter page
  const tab = await chrome.tabs.create({
    url: chapterUrl,
    active: false,
  })

  if (!tab.id) {
    throw new Error('Failed to create tab')
  }

  // Wait for the tab to load
  return new Promise<string>((resolve, reject) => {
    const tabId = tab.id!

    // Listen for tab to complete loading
    const listener = (
      details: chrome.webNavigation.WebNavigationFramedCallbackDetails
    ) => {
      if (details.tabId === tabId && details.frameId === 0) {
        // Remove the listener
        chrome.webNavigation.onCompleted.removeListener(listener)

        // Set up network request listener to capture video URLs
        const videoUrls: string[] = []

        const requestListener = (
          details: chrome.webRequest.WebRequestBodyDetails
        ) => {
          const url = details.url
          // Check if the URL is a video URL (mp4, m3u8, etc.)
          if (/\.(mp4|m3u8|flv|webm)($|\?)/.test(url)) {
            videoUrls.push(url)
          }
        }

        chrome.webRequest.onBeforeRequest.addListener(
          requestListener,
          { tabId, urls: ['<all_urls>'] },
          ['requestBody']
        )

        // Execute script to find video elements
        const checkForVideo = () => {
          chrome.scripting
            .executeScript({
              target: { tabId },
              func: () => {
                // Try to find video elements
                const videos = document.querySelectorAll('video')
                const sources: string[] = []

                videos.forEach((video) => {
                  if (video.src && !video.src.startsWith('blob:')) {
                    sources.push(video.src)
                  }

                  // Check for source elements
                  const sourceElements = video.querySelectorAll('source')
                  sourceElements.forEach((source) => {
                    if (source.src) {
                      sources.push(source.src)
                    }
                  })
                })

                // Try to find video URLs in global variables
                const w = window as any
                if (w.player_aaaa && w.player_aaaa.url) {
                  sources.push(w.player_aaaa.url)
                }

                return sources
              },
            })
            .then((results) => {
              if (results && results.length > 0 && results[0].result) {
                const sources = results[0].result as string[]
                if (sources.length > 0) {
                  // Remove listeners and close tab
                  chrome.webRequest.onBeforeRequest.removeListener(
                    requestListener
                  )
                  clearInterval(intervalId)
                  chrome.tabs.remove(tabId)

                  resolve(sources[0])
                }
              }

              // If we have captured video URLs from network requests, use the first one
              if (videoUrls.length > 0) {
                // Remove listeners and close tab
                chrome.webRequest.onBeforeRequest.removeListener(
                  requestListener
                )
                clearInterval(intervalId)
                chrome.tabs.remove(tabId)

                resolve(videoUrls[0])
              }
            })
        }

        // Check periodically for video elements
        const intervalId = setInterval(checkForVideo, 1000)

        // Set a timeout to prevent hanging
        setTimeout(() => {
          chrome.webRequest.onBeforeRequest.removeListener(requestListener)
          clearInterval(intervalId)
          chrome.tabs.remove(tabId)

          if (videoUrls.length > 0) {
            resolve(videoUrls[0])
          } else {
            reject(new Error('Could not find video URL'))
          }
        }, 30000)
      }
    }

    chrome.webNavigation.onCompleted.addListener(listener)

    // Set a timeout to prevent hanging
    setTimeout(() => {
      chrome.webNavigation.onCompleted.removeListener(listener)
      chrome.tabs.remove(tabId)
      reject(new Error('Timeout while loading chapter page'))
    }, 30000)
  })
}
