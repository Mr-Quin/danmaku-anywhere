import { DanDanAnimeSearchResult } from '@danmaku-anywhere/danmaku-engine'

import { logger } from '../logger'

import { PayloadOf } from './message'

export type AnimeMessage = {
  action: 'anime/search'
  payload: {
    anime: string
    episode?: string
  }
}

export const animeMessage = {
  search: async (payload: PayloadOf<AnimeMessage, 'anime/search'>) => {
    logger.debug('Search for anime:', payload)

    const res = await chrome.runtime.sendMessage({
      action: 'anime/search',
      payload,
    })

    if (!res.success) {
      logger.error(res.error)
      throw new Error(res.error)
    }

    logger.debug('Anime search success', res.payload)

    return res.payload as DanDanAnimeSearchResult
  },
}
