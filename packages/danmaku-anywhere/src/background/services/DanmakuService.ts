import {
  DanDanCommentAPIParams,
  fetchComments,
  getAnime,
} from '@danmaku-anywhere/danmaku-engine'

import { DanmakuMeta, db } from '@/common/db/db'
import { Logger } from '@/common/services/Logger'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils'

export class DanmakuService {
  private db = db.danmakuCache

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
  }

  async fetch(
    data: DanmakuMeta,
    params: Partial<DanDanCommentAPIParams> = { withRelated: true },
    options: { forceUpdate?: boolean; cacheOnly?: boolean } = {}
  ) {
    const { episodeId } = data

    const result = await db.danmakuCache.get(episodeId)

    if (options.cacheOnly) return result
    if (result && !options.forceUpdate) {
      Logger.debug('Danmaku found in db', result)
      return result
    }

    Logger.debug('Danmaku not found in db, fetching from server')

    const comments = await fetchComments(episodeId, {
      ...params,
      withRelated: true,
    })

    Logger.debug('Danmaku fetched from server', comments)

    // prevent updating db if new result has less comments than the old one
    if (
      result &&
      result.comments.length > 0 &&
      result.comments.length >= comments.comments.length
    ) {
      Logger.debug('New danmaku has less comments, skip caching')
      return result
    }

    const newEntry = {
      ...comments,
      meta: data,
      params,
      timeUpdated: Date.now(),
      version: 1 + (result?.version ?? 0),
    }

    // if episode title is not provided, try to get it from the server
    if (data.episodeTitle === undefined) {
      Logger.debug('Episode title not provided, trying to fetch from server')

      const [anime, err] = await tryCatch(async () => getAnime(data.animeId))
      if (!err) {
        const episode = anime.bangumi.episodes.find(
          (e) => e.episodeId === data.episodeId
        )
        if (episode) {
          Logger.debug(`Found episode title: ${episode.episodeTitle}`)
          newEntry.meta.episodeTitle = episode.episodeTitle
        }
      }
    }

    await db.danmakuCache.put(newEntry)

    Logger.debug('Cached danmaku to db')

    return comments
  }

  async delete(episodeId: number) {
    return this.db.delete(episodeId)
  }
}
