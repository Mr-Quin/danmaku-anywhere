import { Logger } from '@/common/Logger'
import {
  DEFAULT_MOUNT_CONFIG_AI_CONFIG,
  type MountConfig,
} from '@/common/options/mountConfig/schema'
import { queryClient } from '@/common/queries/queryClient'
import { genAIQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { sleep } from '@/common/utils/utils'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'

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

export class AiIntegrationObserver extends MediaObserver {
  public override readonly name = 'AiIntegrationObserver'

  private logger = Logger.sub('[AiIntegrationObserver]')

  constructor(private readonly config: MountConfig | null) {
    super()
  }

  private async setupAi(signal: AbortSignal) {
    // Some pages take a while to load the title, so wait a bit before checking
    await sleep(2000)

    if (signal.aborted) {
      this.logger.debug('Aborted AI handling')
      return
    }

    const pageMeta = getPageMeta()
    this.logger.debug('Extracting title from', {
      pageMeta,
    })
    this.emit('parsingChange', true)
    try {
      const { data } = await queryClient.fetchQuery({
        queryKey: genAIQueryKeys.extractTitle(pageMeta),
        queryFn: () =>
          chromeRpcClient.extractTitle({
            text: pageMeta,
            options: this.config?.ai ?? DEFAULT_MOUNT_CONFIG_AI_CONFIG,
          }),
      })

      if (signal.aborted) {
        this.logger.debug('Aborted AI handling')
        return
      }

      this.logger.debug('Matched result:', {
        result: data,
      })

      if (!data.isShow) {
        return
      }

      const mediaInfo = new MediaInfo({
        title: data.title,
        episode: data.episode,
      })
      this.updateMediaInfo(mediaInfo)
    } catch (err) {
      if (signal.aborted) {
        this.logger.debug('Aborted AI handling after an error:', err)
        return
      }
      if (err instanceof Error) {
        this.emit('error', err)
      }
      this.logger.debug('Error while extracting title:', err)
    } finally {
      if (!signal.aborted) {
        this.emit('parsingChange', false)
      }
    }
  }

  setup() {
    // noop
  }

  run() {
    this.logger.debug('Running observer')
    this.reset()
    void this.setupAi(this.startRun())
  }

  override destroy() {
    this.reset()
    super.destroy()
  }

  reset() {
    this.logger.debug('Resetting observer')
    this.stopRun()
  }
}
