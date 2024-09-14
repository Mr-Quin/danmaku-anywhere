import { Logger } from '@/common/Logger'
import type { XPathPolicy } from '@/common/options/xpathPolicyStore/schema'
import { MediaInfo } from '@/content/danmaku/integration/MediaInfo'
import { MediaObserver } from '@/content/danmaku/integration/MediaObserver'

const getElementByXpath = (path: string, parent = window.document) => {
  return document.evaluate(
    path,
    parent,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue
}

const getFirstElement = (selectors: string[], parent = window.document) => {
  for (const p of selectors) {
    const element = getElementByXpath(p, parent)
    if (element) {
      return element
    }
  }
  return null
}

const parseNumber = (text: string, regex?: string) => {
  if (regex) {
    const match = text.match(new RegExp(regex, 'ig'))

    if (match === null) {
      throw new Error(`Regex ${regex} does not match text \`${text}\``)
    }

    const parsed = parseInt(match[0])

    if (isNaN(parsed)) {
      throw new Error(
        `Matched \`${match}\` in \`${text}\` using ${regex}, but parsing it as number resulted in NaN`
      )
    }

    return parsed
  }

  const parsed = parseInt(text)

  if (isNaN(parsed)) {
    throw new Error(`Parsing \`${text}\` resulted in NaN`)
  }
  return parsed
}

const getMediaInfo = (elements: MediaElements, policy: XPathPolicy) => {
  const title = elements.title.textContent

  if (!title) return

  // Default to 1 if the element is not present
  let season = 1
  let episode = 1

  // If the episode element is not present, assume it's a movie or something that doesn't have episodes
  if (elements.episode?.textContent) {
    const episodeText = elements.episode.textContent
    episode = parseNumber(episodeText, policy.episodeRegex)
  }

  // Same assumption as above
  if (elements.season?.textContent) {
    const seasonText = elements.season.textContent
    season = parseNumber(seasonText, policy.seasonRegex)
  }

  return new MediaInfo(title, episode, season)
}

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
    }
  })
  observer.observe(element, {
    characterData: true,
    childList: true,
    subtree: true,
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

type MonitoredElements = 'title' | 'episode' | 'season'

interface MediaElements {
  title: Node
  episode: Node | null
  season: Node | null
}

export class XPathObserver extends MediaObserver {
  private interval?: NodeJS.Timeout
  private logger = Logger.sub('[XPathObserver]')
  private observerMap = new Map<MonitoredElements, MutationObserver>()

  constructor(public policy: XPathPolicy) {
    super()
  }

  private async discoverElements() {
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
        const titleElement = getFirstElement(this.policy.title)
        if (titleElement) {
          clearInterval(this.interval)
          resolve({
            title: titleElement,
            episode: getFirstElement(this.policy.episode),
            season: getFirstElement(this.policy.season),
          })
        }
      } catch (err) {
        this.logger.debug('Error while discovering title:', err)
      }
    }, 1000)

    return promise
  }

  private updateMediaInfo(elements: MediaElements) {
    try {
      const mediaInfo = getMediaInfo(elements, this.policy)
      if (mediaInfo) {
        this.emit('mediaChange', mediaInfo)
      }
    } catch (err) {
      this.logger.debug('Error while getting media info:', err)
    }
  }

  private async asyncSetup() {
    this.logger.debug('Discovering elements')
    const elements = await this.discoverElements()
    this.logger.debug('Elements discovered, setting up observers', elements)

    this.observerMap.set(
      'title',
      createTextMutationObserver(elements.title, (text) => {
        this.emit('titleChange', text)
        this.updateMediaInfo(elements)
      })
    )

    if (elements.episode) {
      this.observerMap.set(
        'episode',
        createTextMutationObserver(elements.episode, (text) => {
          this.emit('episodeChange', parseInt(text))
          this.updateMediaInfo(elements)
        })
      )
    }

    if (elements.season) {
      this.observerMap.set(
        'season',
        createTextMutationObserver(elements.season, (text) => {
          this.emit('seasonChange', parseInt(text))
          this.updateMediaInfo(elements)
        })
      )
    }

    this.updateMediaInfo(elements)

    // When the title element is removed, rerun setup
    createRemovalMutationObserver(elements.title, () => {
      this.logger.debug('Title element removed, rerunning setup')
      this.destroy()
      this.setup()
    })
  }

  setup() {
    void this.asyncSetup()
  }

  destroy() {
    clearInterval(this.interval)
    this.observerMap.forEach((observer) => observer.disconnect())
  }
}
