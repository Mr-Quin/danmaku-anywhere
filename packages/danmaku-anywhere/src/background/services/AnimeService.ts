import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider'
import { searchAnime } from '@danmaku-anywhere/danmaku-provider'

import { invariant, isServiceWorker } from '@/common/utils/utils'

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
