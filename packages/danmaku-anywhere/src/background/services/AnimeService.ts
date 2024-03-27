import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { searchAnime } from '@danmaku-anywhere/dandanplay-api'

import { invariant, isServiceWorker } from '@/common/utils'

export class AnimeService {
  constructor() {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
  }

  async search(searchParams: DanDanAnimeSearchAPIParams) {
    return searchAnime(searchParams)
  }
}
