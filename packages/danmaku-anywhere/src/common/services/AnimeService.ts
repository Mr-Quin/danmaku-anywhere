import { searchAnime } from '@danmaku-anywhere/danmaku-engine'

export class AnimeService {
  async search(...args: Parameters<typeof searchAnime>) {
    return searchAnime(...args)
  }
}
