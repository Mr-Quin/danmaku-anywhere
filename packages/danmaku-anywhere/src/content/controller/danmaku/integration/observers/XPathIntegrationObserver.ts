import { Logger } from '@/common/Logger'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'

import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
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

export class XPathIntegrationObserver extends MediaObserver {
  private interval?: NodeJS.Timeout
  private logger = Logger.sub('[XPathIntegrationObserver]')
  private observerMap = new Map<string, MutationObserver>()

  constructor(public policy: IntegrationPolicy | null) {
    super()
    this.logger.debug('Creating observer')
  }

  private async discoverElementsXpath() {
    if (this.interval) {
      clearInterval(this.interval)
    }

    const { resolve, promise, reject } = Promise.withResolvers<MediaElements>()

    this.updateStatus('Looking for video elements...')
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
        if (!this.policy) {
          reject('Policy not found')
          return
        }
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

  protected updateMediaInfo(mediaInfo: MediaInfo) {
    // Only update if the media info has changed
    if (this.mediaInfo?.equals(mediaInfo)) {
      return
    }
    this.logger.debug('Media info changed:', mediaInfo)
    super.updateMediaInfo(mediaInfo)
    this.updateStatus('Video info found: ' + mediaInfo.toString())
  }

  private parseMediaElements(elements: MediaElements) {
    if (!this.policy) {
      this.emit('error', new Error('Policy not found'))
      return
    }
    const extractionResult = extractMediaInfo(elements, this.policy)

    if (!extractionResult.success) {
      this.emit('error', new Error(extractionResult.error))
      this.logger.debug(
        'Error while getting media info:',
        extractionResult.error
      )
      return
    }

    this.updateMediaInfo(extractionResult.mediaInfo)
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
      this.restart()
    })

    this.observerMap.set('removal', observer)
  }

  setup() {
    // noop
  }

  restart() {
    this.logger.debug('Restarting observer')
    this.reset()
    this.setupXpath()
  }

  destroy() {
    this.reset()
    super.destroy()
  }

  reset() {
    this.logger.debug('Resetting observer')
    clearInterval(this.interval)
    this.observerMap.forEach((observer) => observer.disconnect())
    this.observerMap.clear()
    this.status = ''
    this.mediaInfo = undefined
  }
}
