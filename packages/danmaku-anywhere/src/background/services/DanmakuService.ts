import {
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'

import { DanmakuMeta, db } from '@/common/db/db'
import { Logger } from '@/common/services/Logger'
import { invariant, isServiceWorker } from '@/common/utils'

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
    if (result && !options.forceUpdate) return result

    Logger.debug('Danmaku not found in db, fetching from server')

    const comments = await fetchComments(episodeId, params)

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

    Logger.debug('Cached danmaku to db')

    await db.danmakuCache.put(newEntry)

    return comments
  }

  async delete(episodeId: number) {
    return this.db.delete(episodeId)
  }
}
