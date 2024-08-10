import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { searchAnime } from '@danmaku-anywhere/danmaku-provider/ddp'

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
