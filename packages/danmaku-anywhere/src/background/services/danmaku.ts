import { fetchComments } from '@danmaku-anywhere/danmaku-engine'
import { DanmakuMeta, db } from '@/common/db'
import { logger } from '@/common/logger'

const fetchDanmaku = async (
  data: DanmakuMeta,
  params: Partial<DanDanCommentAPIParams> = { withRelated: true },
  options: { forceUpdate?: boolean; cacheOnly?: boolean } = {}
) => {
  const { episodeId } = data

  const result = await db.dandanplay.get(episodeId)

  if (options.cacheOnly) return result
  if (result && !options.forceUpdate) return result

  logger.debug('Danmaku not found in db, fetching from server')

  const comments = await fetchComments(episodeId, params)

  logger.debug('Danmaku fetched from server', comments)

  // prevent updating db if new result has less comments than the old one
  if (
    result &&
    result.comments.length > 0 &&
    result.comments.length >= comments.comments.length
  ) {
    logger.debug('New danmaku has less comments, skip caching')
    return result
  }

  const newEntry = {
    ...comments,
    meta: data,
    params,
    timeUpdated: Date.now(),
    version: 1 + (result?.version ?? 0),
  }

  logger.debug('Cached danmaku to db')

  await db.dandanplay.put(newEntry)

  return comments
}

const deleteDanmaku = async (episodeId: number) => {
  return await db.dandanplay.delete(episodeId)
}

export const danmakuService = {
  fetch: fetchDanmaku,
  delete: deleteDanmaku,
}
