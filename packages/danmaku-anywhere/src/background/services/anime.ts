import {
  DanDanAnimeSearchAPIParams,
  searchAnime,
} from '@danmaku-anywhere/danmaku-engine'

export const animeService = {
  search: async ({
    anime,
    episode,
  }: {
    anime: DanDanAnimeSearchAPIParams['anime']
    episode?: DanDanAnimeSearchAPIParams['episode']
  }) =>
    searchAnime({
      anime,
      episode: episode ?? '',
    }),
}
