import type { CustomSeason } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchVod,
} from '@danmaku-anywhere/danmaku-provider/generic'
import { Logger } from '@/common/Logger'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { DanmakuService } from './DanmakuService'

export class CustomProviderService {
  private logger: typeof Logger

  constructor(private danmakuService: DanmakuService) {
    invariant(
      isServiceWorker(),
      'CustomProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[CustomProviderService]')
  }

  async search(baseUrl: string, keyword: string): Promise<CustomSeason[]> {
    this.logger.debug('Searching for', {
      baseUrl,
      keyword,
    })
    const res = await searchVod(baseUrl, keyword)

    return res.list.map((item, i) => {
      const id = `custom:${item.vod_id}:${i}`
      return {
        id: i,
        version: 1,
        timeUpdated: 0,
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
        episodes: item.parsedPlayUrls,
      }
    })
  }

  async fetchDanmakuForUrl(title: string, url: string) {
    const comments = await fetchDanmuIcuComments(url)
    return this.danmakuService.importCustom({ title, comments })
  }
}
