import { Logger } from '@/common/Logger'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { getFirstElement } from '@/common/utils/utils'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaElements } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import {
  parseMediaFromTitle,
  parseMediaNumber,
  parseMediaString,
  parseMultipleRegex,
} from '@/content/controller/danmaku/integration/observers/parse'

type MediaElementsText = {
  [Key in keyof MediaElements]: string | null
}

const parseMediaInfo = (
  elements: MediaElementsText,
  policy: IntegrationPolicy
) => {
  const titleText = elements.title

  if (!titleText) throw new Error('Title element not found')

  // If titleOnly is true, then try to parse the media info from the title alone
  if (policy.titleOnly)
    return parseMediaFromTitle(titleText, policy.title.regex)

  const title = parseMultipleRegex(
    parseMediaString,
    titleText,
    policy.title.regex
  )

  if (title === undefined) {
    throw new Error(
      `Error parsing title: ${JSON.stringify({
        title: titleText,
        regex: policy.title.regex,
      })}`
    )
  }

  // Default to 1 if the element is not present
  let episode = 1
  let episodic = false
  let episodeTitle: string | undefined = undefined
  let season: string | undefined = undefined

  // If the episode element is not present, assume it's a movie or something that doesn't have episodes
  if (elements.episode) {
    const parsedEpisode = parseMultipleRegex(
      parseMediaNumber,
      elements.episode,
      policy.episode.regex
    )
    if (parsedEpisode !== undefined) {
      episode = parsedEpisode
      episodic = true
    }
  }

  if (elements.season) {
    season = parseMultipleRegex(
      parseMediaString,
      elements.season,
      policy.season.regex
    )
  }

  if (elements.episodeTitle) {
    episodeTitle = parseMultipleRegex(
      parseMediaString,
      elements.episodeTitle,
      policy.episodeTitle.regex
    )
  }

  return new MediaInfo(title, episode, season, episodic, episodeTitle)
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

const getTextFromMediaElements = (
  elements: MediaElements
): MediaElementsText => {
  return {
    title: elements.title.textContent,
    episode: elements.episode?.textContent ?? null,
    season: elements.season?.textContent ?? null,
    episodeTitle: elements.episodeTitle?.textContent ?? null,
  }
}

export class IntegrationPolicyObserver extends MediaObserver {
  private interval?: NodeJS.Timeout
  private logger = Logger.sub('[IntegrationPolicyObserver]')
  private observerMap = new Map<string, MutationObserver>()
  private mediaInfo?: MediaInfo

  constructor(public policy: IntegrationPolicy) {
    super()
    this.logger.debug('Creating observer')
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
        const titleElement = getFirstElement(this.policy.title.selector)
        // Title is required, the rest are optional
        if (titleElement) {
          clearInterval(this.interval)
          if (this.policy.titleOnly) {
            resolve({
              title: titleElement,
              episode: null,
              season: null,
              episodeTitle: null,
            })
          } else {
            resolve({
              title: titleElement,
              episode: getFirstElement(this.policy.episode.selector),
              season: getFirstElement(this.policy.season.selector),
              episodeTitle: getFirstElement(this.policy.episodeTitle.selector),
            })
          }
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

  private updateMediaInfo(elements: MediaElements) {
    try {
      const mediaInfo = parseMediaInfo(
        getTextFromMediaElements(elements),
        this.policy
      )
      // Only update if the media info has changed
      if (this.mediaInfo?.equals(mediaInfo)) {
        return
      }
      this.logger.debug('Media info changed:', mediaInfo)
      this.mediaInfo = mediaInfo
      this.emit('mediaChange', mediaInfo)
    } catch (err) {
      if (err instanceof Error) {
        this.emit('error', err)
      }
      this.logger.debug('Error while getting media info:', err)
    }
  }

  private async asyncSetup() {
    this.logger.debug('Discovering elements')
    const elements = await this.discoverElements()
    this.emit('mediaElementsChange', elements)
    this.logger.debug('Elements discovered, setting up observers')

    // Observe each element for text changes
    ;(Object.keys(elements) as (keyof typeof elements)[]).forEach((key) => {
      if (elements[key]) {
        const observer = createTextMutationObserver(elements[key], () => {
          this.updateMediaInfo(elements)
        })
        this.observerMap.set(key, observer)
      }
    })

    this.updateMediaInfo(elements)

    // When the title element is removed, rerun setup
    const observer = createRemovalMutationObserver(elements.title, () => {
      this.logger.debug('Title element removed, rerunning setup')
      this.destroy()
      this.setup()
    })

    this.observerMap.set('removal', observer)
  }

  setup() {
    void this.asyncSetup()
  }

  destroy() {
    clearInterval(this.interval)
    this.logger.debug('Destroying observers')
    this.observerMap.forEach((observer) => observer.disconnect())
    this.observerMap.clear()
  }

  reset() {
    this.mediaInfo = undefined
  }
}
