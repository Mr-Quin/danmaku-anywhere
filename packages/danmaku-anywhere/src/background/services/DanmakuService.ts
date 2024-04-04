import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { fetchComments, getAnime } from '@danmaku-anywhere/dandanplay-api'

import type { DanmakuCacheLite, DanmakuMeta } from '@/common/db/db'
import { db } from '@/common/db/db'
import { Logger } from '@/common/services/Logger'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils'

export class DanmakuService {
  private db = db.danmakuCache
  private logger: typeof Logger

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async fetch(
    data: DanmakuMeta,
    params: Partial<DanDanCommentAPIParams> = { withRelated: true },
    options: DanmakuFetchOptions = {}
  ) {
    const { episodeId } = data

    const result = await this.db.get(episodeId)

    if (result && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', result)
      return result
    }

    this.logger.debug('Danmaku not found in db, fetching from server')

    const comments = await fetchComments(episodeId, {
      ...params,
      withRelated: true,
    })

    this.logger.debug('Danmaku fetched from server', comments)

    // prevent updating db if new result has less comments than the old one
    if (
      result &&
      result.comments.length > 0 &&
      result.comments.length >= comments.comments.length
    ) {
      this.logger.debug('New danmaku has less comments, skip caching')
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
      this.logger.debug(
        'Episode title not provided, trying to fetch from server'
      )

      const [anime, err] = await tryCatch(async () => getAnime(data.animeId))
      if (!err) {
        const episode = anime.bangumi.episodes.find(
          (e) => e.episodeId === data.episodeId
        )
        if (episode) {
          this.logger.debug(`Found episode title: ${episode.episodeTitle}`)
          newEntry.meta.episodeTitle = episode.episodeTitle
        }
      }
    }

    await this.db.put(newEntry)

    this.logger.debug('Cached danmaku to db')

    return comments
  }

  async delete(episodeId: number) {
    return this.db.delete(episodeId)
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll() {
    return this.db.toArray()
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite() {
    const result: DanmakuCacheLite[] = []

    await this.db.toCollection().each((cache) => {
      result.push({
        meta: cache.meta,
        count: cache.count,
      })
    })

    return result
  }

  async getByEpisodeId(episodeId: number) {
    return this.db.get(episodeId)
  }
}
