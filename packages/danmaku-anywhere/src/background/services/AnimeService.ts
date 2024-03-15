import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-engine'
import { searchAnime } from '@danmaku-anywhere/danmaku-engine'

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
