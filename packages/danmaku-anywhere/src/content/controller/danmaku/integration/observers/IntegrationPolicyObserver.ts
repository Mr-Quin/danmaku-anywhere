import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { Logger } from '@/common/Logger'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { queryClient } from '@/common/queries/queryClient'
import { genAIQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { sleep } from '@/common/utils/utils'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaElements } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { extractMediaInfo } from '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo'
import { matchNodesByXPathPolicy } from '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy'

const createTextMutationObserver = (
  element: Node,
  onTextChange: (text: string) => void
) => {
  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.type === 'characterData') {
        const text = mutation.target.textContent
        if (text) {
          onTextChange(text)
        }
      }
      // see if the added node is a text node
      if (mutation.type === 'childList') {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.TEXT_NODE) {
            const text = addedNode.textContent
            if (text) {
              onTextChange(text)
            }
          }
        }
      }
    }
  })

  observer.observe(element, {
    characterData: true,
    childList: true,
    subtree: true,
    attributes: true,
  })

  return observer
}

const createRemovalMutationObserver = (element: Node, onRemove: () => void) => {
  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === element || removedNode.contains(element)) {
          onRemove()
          break
        }
      }
    }
  })

  observer.observe(document, {
    childList: true,
    subtree: true,
  })

  return observer
}

const truncateString = (value: string, maxLength: number) => {
  if (value.length > maxLength) {
    return value.substring(0, maxLength) + '...'
  }
  return value
}

const getHtmlByTag = (tag: string) => {
  const html: string[] = []
  const nodes = document.querySelectorAll(tag)

  // Filter out bloated information to reduce the size of the message
  const filterNodeAttributes = (node: Element): string => {
    if (!(node instanceof HTMLElement)) return node.outerHTML

    const element = node
    const clone = element.cloneNode(true) as HTMLElement

    if (element.hasAttributes()) {
      for (const attr of Array.from(element.attributes)) {
        if (
          attr.name.toLowerCase() === 'href' ||
          attr.name.toLowerCase() === 'src' ||
          attr.name.toLowerCase() === 'class'
        ) {
          clone.setAttribute(attr.name, truncateString(attr.value, 20))
        } else if (attr.name.toLowerCase().startsWith('data-')) {
          clone.setAttribute(attr.name, truncateString(attr.value, 5))
        }
      }
    }

    if (element.children.length > 0) {
      const filteredChildrenHTML: string[] = []

      for (const child of element.children) {
        filteredChildrenHTML.push(filterNodeAttributes(child))
      }

      clone.innerHTML = filteredChildrenHTML.join('')
    }

    return clone.outerHTML
  }

  nodes.forEach((node) => {
    if (node instanceof Element) {
      html.push(filterNodeAttributes(node))
    }
  })

  return html
}

const getPageMeta = () => {
  const tags = ['meta', 'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']

  const html = tags.flatMap(getHtmlByTag).join('')
  return truncateString(html, 4000)
}

export class IntegrationPolicyObserver extends MediaObserver {
  private interval?: NodeJS.Timeout
  private logger = Logger.sub('[IntegrationPolicyObserver]')
  private observerMap = new Map<string, MutationObserver>()
  private mediaInfo?: MediaInfo
  private abortControllerQueue: AbortController[] = []

  constructor(public policy: IntegrationPolicy) {
    super()
    this.logger.debug('Creating observer')
  }

  private async discoverElementsXpath() {
    if (this.interval) {
      clearInterval(this.interval)
    }

    const { resolve, promise, reject } = Promise.withResolvers<MediaElements>()

    /**
     * Is there a way to detect when an element is added by xpath?
     * As a suboptimal solution, check every second to see if the title element is present
     */
    this.interval = setInterval(() => {
      // if the interval is cleared, reject the promise
      if (this.interval === undefined) {
        reject('Interval cleared')
      }

      try {
        const matchedNodes = matchNodesByXPathPolicy(this.policy)
        if (matchedNodes) {
          clearInterval(this.interval)
          resolve(matchedNodes)
        }
      } catch (err) {
        if (err instanceof Error) {
          this.emit('error', err)
        }
        this.logger.debug('Error while discovering title:', err)
      }
    }, 1000)

    return promise
  }

  private updateMediaInfo(mediaInfo: MediaInfo) {
    // Only update if the media info has changed
    if (this.mediaInfo?.equals(mediaInfo)) {
      return
    }
    this.logger.debug('Media info changed:', mediaInfo)
    this.mediaInfo = mediaInfo
    this.emit('mediaChange', mediaInfo)
  }

  private parseMediaElements(elements: MediaElements) {
    try {
      const mediaInfo = extractMediaInfo(elements, this.policy)
      this.updateMediaInfo(mediaInfo)
    } catch (err) {
      if (err instanceof Error) {
        this.emit('error', err)
      }
      this.logger.debug('Error while getting media info:', err)
    }
  }

  private async setupXpath() {
    this.logger.debug('Discovering elements using XPath')
    const elements = await this.discoverElementsXpath()
    this.emit('mediaElementsChange', elements)
    this.logger.debug('Elements discovered, setting up observers')

    // Observe each element for text changes
    const elementsKeys = Object.keys(elements) as (keyof MediaElements)[]
    elementsKeys.forEach((key) => {
      if (elements[key]) {
        const observer = createTextMutationObserver(elements[key], () => {
          this.parseMediaElements(elements)
        })
        this.observerMap.set(key, observer)
      }
    })

    this.parseMediaElements(elements)

    // When the title element is removed, rerun setup
    const observer = createRemovalMutationObserver(elements.title, () => {
      this.logger.debug('Title element removed, rerunning setup')
      this.reset()
      this.setup()
    })

    this.observerMap.set('removal', observer)
  }

  private async setupAi() {
    const abortController = new AbortController()
    this.abortControllerQueue.push(abortController)

    // Some pages take a while to load the title, so wait a bit before checking
    await sleep(2000)

    if (abortController.signal.aborted) {
      this.logger.debug('Aborted AI handling')
      return
    }

    const meta = getPageMeta()
    try {
      this.logger.debug('Extracting title from', {
        meta,
      })

      const { data } = await queryClient.fetchQuery({
        queryKey: genAIQueryKeys.extractTitle(meta),
        queryFn: () => chromeRpcClient.extractTitle(meta),
      })

      if (abortController.signal.aborted) {
        this.logger.debug('Aborted AI handling')
        return
      }

      this.logger.debug('Matched result:', {
        result: data,
      })

      if (!data.isShow) {
        return
      }

      const mediaInfo = new MediaInfo(data.title, data.episode)
      this.updateMediaInfo(mediaInfo)
    } catch (err) {
      if (err instanceof Error) {
        this.emit('error', err)
      }
      this.logger.debug('Error while extracting title:', err)
    }
  }

  setup(policy?: IntegrationPolicy) {
    if (policy) {
      this.policy = policy
    }
    if (this.policy.options.useAI) {
      this.logger.debug('Setting up using AI')
      getTrackingService().track('setupAiIntegration', policy)
      void this.setupAi()
    } else {
      this.logger.debug('Setting up using XPath')
      getTrackingService().track('setupXpathIntegration', policy)
      void this.setupXpath()
    }
  }

  destroy() {
    this.reset()
    super.destroy()
  }

  reset() {
    this.logger.debug('Resetting observer')
    clearInterval(this.interval)
    this.abortControllerQueue.forEach((controller) => controller.abort())
    this.abortControllerQueue = []
    this.observerMap.forEach((observer) => observer.disconnect())
    this.observerMap.clear()
  }
}
