import type {
  DanDanAnimeSearchAPIParams,
  DanDanAnimeSearchResult,
} from '@danmaku-anywhere/dandanplay-api'

import { Logger } from '../services/Logger'

import type { PayloadOf } from './message'

export interface AnimeMessage {
  action: 'anime/search'
  payload: DanDanAnimeSearchAPIParams
}

export const animeMessage = {
  search: async (payload: PayloadOf<AnimeMessage, 'anime/search'>) => {
    Logger.debug('Search for anime:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'anime/search',
      payload,
    })

    if (!res.success) {
      Logger.error(res.error)
      throw new Error(res.error)
    }

    Logger.debug('Anime search success', res.payload)

    return res.payload as DanDanAnimeSearchResult
  },
}
