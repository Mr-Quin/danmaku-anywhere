import type { CustomSeason } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { VodItem } from '@danmaku-anywhere/danmaku-provider/generic'
import {
  fetchDanmuIcuComments,
  searchVod,
} from '@danmaku-anywhere/danmaku-provider/generic'
import { Logger } from '@/common/Logger'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { DanmakuService } from './DanmakuService'

export type CustomVod = {
  id: string
  title: string
  imageUrl?: string
  playFrom?: string
  playUrls: ParsedPlayUrl[]
}

export type ParsedPlayUrl = {
  source: string
  url: string
  episodeNumber: number
}

export class CustomProviderService {
  private logger: typeof Logger

  constructor(private danmakuService: DanmakuService) {
    invariant(
      isServiceWorker(),
      'CustomProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[CustomProviderService]')
  }

  async search(
    baseUrl: string,
    keyword: string
  ): Promise<{ seasons: CustomSeason[]; list: VodItem[] }> {
    this.logger.debug('Searching for', {
      baseUrl,
      keyword,
    })
    const res = await searchVod(baseUrl, keyword)

    const seasons: CustomSeason[] = res.list.map((item, idx) => {
      const id = `custom:${idx}`
      return {
        id: idx,
        version: 1,
        timeUpdated: Date.now(),
        indexedId: id,
        title: item.vod_name,
        type: 'Custom',
        imageUrl: item.vod_pic ?? undefined,
        externalLink: undefined,
        localEpisodeCount: undefined,
        year: item.vod_year
          ? Number.parseInt(item.vod_year) || undefined
          : undefined,
        schemaVersion: 1,
        provider: DanmakuSourceType.Custom,
        providerIds: {},
      }
    })

    return { seasons, list: res.list }
  }

  parsePlayUrls(item: VodItem): ParsedPlayUrl[] {
    // play_url separated by $$$ for providers, then within each provider, episodes separated by #, with N$URL pairs
    const providerBlocks = (item.vod_play_url ?? '')
      .split('$$$')
      .filter(Boolean)
    const providers = (item.vod_play_from ?? '').split('$$$')
    const results: ParsedPlayUrl[] = []
    providerBlocks.forEach((block, i) => {
      const source = providers[i] ?? `source_${i}`
      const entries = block.split('#').filter(Boolean)
      entries.forEach((entry) => {
        const [epNumRaw, url] = entry.split('$')
        const episodeNumber = Number.parseInt(epNumRaw)
        if (!url) return
        results.push({
          source,
          url,
          episodeNumber: Number.isNaN(episodeNumber)
            ? results.length + 1
            : episodeNumber,
        })
      })
    })
    return results
  }

  async fetchDanmakuForUrl(title: string, url: string) {
    const comments = await fetchDanmuIcuComments(url)
    return this.danmakuService.importCustom({ title, comments })
  }
}
