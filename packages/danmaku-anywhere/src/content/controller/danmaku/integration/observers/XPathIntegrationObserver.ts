import { Logger } from '@/common/Logger'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'

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
  public override readonly name: string = 'XPathIntegrationObserver'

  private logger = Logger.sub('[XPathIntegrationObserver]')
  private observerMap = new Map<string, MutationObserver>()

  constructor(public policy: IntegrationPolicy | null) {
    super()
    this.logger.debug('Creating observer')
  }

  // No DOM event fires when an XPath match appears, so this polls.
  private discoverElements(
    policy: IntegrationPolicy,
    signal: AbortSignal
  ): Promise<MediaElements | undefined> {
    return new Promise((resolve) => {
      const finish = (elements?: MediaElements) => {
        clearInterval(interval)
        signal.removeEventListener('abort', onAbort)
        resolve(elements)
      }
      const onAbort = () => {
        finish(undefined)
      }
      const interval = setInterval(() => {
        try {
          const matchedNodes = matchNodesByXPathPolicy(policy)
          if (matchedNodes) {
            finish(matchedNodes)
          }
        } catch (err) {
          if (err instanceof Error) {
            this.emit('error', err)
          }
          this.logger.debug('Error while discovering title:', err)
        }
      }, 1000)
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  private parseMediaElements(elements: MediaElements) {
    if (!this.policy) {
      this.emit('error', new Error('Policy not found'))
      return
    }
    const extractionResult = extractMediaInfo(elements, this.policy)

    if (!extractionResult.success) {
      // Forget the last media so the same media is reported again once the
      // page recovers.
      this.mediaInfo = undefined
      this.emit('error', new Error(extractionResult.error))
      this.logger.debug(
        'Error while getting media info:',
        extractionResult.error
      )
      return
    }

    this.updateMediaInfo(extractionResult.mediaInfo)
  }

  private async setupXpath(signal: AbortSignal) {
    if (!this.policy) {
      this.emit('error', new Error('Policy not found'))
      return
    }
    this.logger.debug('Discovering elements using XPath')
    const elements = await this.discoverElements(this.policy, signal)
    if (!elements || signal.aborted) {
      this.logger.debug('Discovery finished after a reset, ignoring it')
      return
    }
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
      this.run()
    })

    this.observerMap.set('removal', observer)
  }

  setup() {
    // noop
  }

  run() {
    this.logger.debug('Running observer')
    this.reset()
    void this.setupXpath(this.startRun())
  }

  override destroy() {
    this.reset()
    super.destroy()
  }

  reset() {
    this.logger.debug('Resetting observer')
    this.stopRun()
    this.observerMap.forEach((observer) => observer.disconnect())
    this.observerMap.clear()
  }
}
