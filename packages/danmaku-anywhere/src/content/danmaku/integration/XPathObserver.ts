import { Logger } from '@/common/Logger'
import type { XPathPolicy } from '@/common/options/xpathPolicyStore/schema'
import { getFirstElement } from '@/common/utils/utils'
import { MediaInfo } from '@/content/danmaku/integration/MediaInfo'
import { MediaObserver } from '@/content/danmaku/integration/MediaObserver'

export const parseNumber = (text: string, regex: string) => {
  const match = text.match(new RegExp(regex, 'i'))

  if (match === null) {
    throw new Error(`Regex ${regex} does not match text \`${text}\``)
  }

  // Prefer the first capture group if it exists
  const parseIndex = match[1] ? 1 : 0
  const parsed = parseInt(match[parseIndex])

  if (isNaN(parsed)) {
    throw new Error(
      `Matched \`${match}\` in \`${text}\` using ${regex}, but parsing at index ${parseIndex} as number resulted in NaN`
    )
  }

  return parsed
}

export const parseString = (text: string, regex: string) => {
  const match = text.match(new RegExp(regex, 'i'))

  if (match === null) {
    throw new Error(`Regex ${regex} does not match text \`${text}\``)
  }

  // Prefer the first capture group if it exists
  return match[1] ?? match[0]
}

const parseMultipleRegex = <T>(
  parser: (text: string, regex: string) => T,
  text: string,
  regex: string[]
): T => {
  const errors: string[] = []

  for (const reg of regex) {
    try {
      return parser(text, reg)
    } catch (err) {
      if (err instanceof Error) {
        errors.push(err.message)
      }
    }
  }

  throw new Error(errors.join('\n'))
}

const getMediaInfo = (elements: MediaElements, policy: XPathPolicy) => {
  const titleText = elements.title.textContent

  if (!titleText) return

  const title = parseMultipleRegex(parseString, titleText, policy.title.regex)

  // Default to 1 if the element is not present
  let season = 1
  let episode = 1
  let episodic = false
  let episodeTitle = undefined

  // If the episode element is not present, assume it's a movie or something that doesn't have episodes
  if (elements.episodeNumber?.textContent) {
    const episodeText = elements.episodeNumber.textContent
    episode = parseMultipleRegex(
      parseNumber,
      episodeText,
      policy.episodeNumber.regex
    )
    episodic = true
  }

  // Same assumption as above
  if (elements.seasonNumber?.textContent) {
    const seasonText = elements.seasonNumber.textContent
    season = parseMultipleRegex(
      parseNumber,
      seasonText,
      policy.seasonNumber.regex
    )
  }

  if (elements.episodeTitle?.textContent) {
    const episodeTitleText = elements.episodeTitle.textContent
    episodeTitle = parseMultipleRegex(
      parseString,
      episodeTitleText,
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

interface MediaElements {
  title: Node
  episodeNumber: Node | null
  seasonNumber: Node | null
  episodeTitle: Node | null
}

export class XPathObserver extends MediaObserver {
  private interval?: NodeJS.Timeout
  private logger = Logger.sub('[XPathObserver]')
  private observerMap = new Map<string, MutationObserver>()
  private mediaInfo?: MediaInfo

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
        const titleElement = getFirstElement(this.policy.title.selector)
        if (titleElement) {
          clearInterval(this.interval)
          resolve({
            title: titleElement,
            episodeNumber: getFirstElement(this.policy.episodeNumber.selector),
            seasonNumber: getFirstElement(this.policy.seasonNumber.selector),
            episodeTitle: getFirstElement(this.policy.episodeTitle.selector),
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
        // Only update if the media info has changed
        if (this.mediaInfo?.equals(mediaInfo)) {
          return
        }
        this.logger.debug('Media info changed:', mediaInfo)
        this.mediaInfo = mediaInfo
        this.emit('mediaChange', mediaInfo)
      }
    } catch (err) {
      this.logger.debug('Error while getting media info:', err)
    }
  }

  private async asyncSetup() {
    this.logger.debug('Discovering elements')
    const elements = await this.discoverElements()
    this.logger.debug('Elements discovered, setting up observers')

    // Observe each element for text changes
    ;(Object.keys(elements) as (keyof typeof elements)[]).forEach((key) => {
      if (elements[key]) {
        createTextMutationObserver(elements[key], (text) => {
          this.updateMediaInfo(elements)
        })
      }
    })

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
