import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import type { KazumiChapterResult, KazumiSearchResult } from '../types.js'
import { createJob, createTab, Logger } from '../utils.js'

export const kazumiSearch = async (
  keyword: string,
  policy: KazumiPolicy
): Promise<KazumiSearchResult[]> => {
  // Replace @keyword in the search URL with the actual keyword
  const searchUrl = policy.searchURL.replace(
    '@keyword',
    encodeURIComponent(keyword)
  )

  await using tabResource = await createTab(searchUrl)

  const { tabId } = tabResource

  const task = () =>
    chrome.scripting.executeScript<string[], KazumiSearchResult[]>({
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

  const job = createJob(task, (results) => {
    return results.length > 0 && !!results[0].result
  })

  Logger.debug('Looking for search results in page', searchUrl)

  const results = await job.run()

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('Failed to search content')
}

export const kazumiGetChapters = async (
  contentUrl: string,
  policy: KazumiPolicy
): Promise<KazumiChapterResult[][]> => {
  await using tabResource = await createTab(contentUrl)

  const { tabId } = tabResource

  const task = () =>
    chrome.scripting.executeScript<string[], KazumiChapterResult[][]>({
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
                  chapterNode instanceof HTMLAnchorElement
                    ? chapterNode.href
                    : ''

                if (!name || !url) {
                  return null
                }
                return {
                  name,
                  url,
                }
              })
              .filter(
                (result) => result !== null
              ) satisfies KazumiChapterResult[]
          })
          .filter((playList) => playList.length > 0)
      },
      args: [policy.chapterRoads, policy.chapterResult],
    })

  const job = createJob(task, (results) => {
    return results.length > 0 && !!results[0].result
  })

  Logger.debug('Looking for play lists in page', contentUrl)

  const results = await job.run()

  if (results[0].result) {
    return results[0].result
  }

  throw new Error('No chapters found')
}
