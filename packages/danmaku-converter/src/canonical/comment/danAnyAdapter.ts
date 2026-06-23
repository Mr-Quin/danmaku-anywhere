import { defineAdapter } from '@dan-uni/dan-any/adapters'
import {
  defaultUniDM,
  type InitedUniDB,
  type UDanmaku,
  type UniChunk,
} from '@dan-uni/dan-any/core'
import { hexToRgb888 } from '../../utils/index.js'
import type {
  CustomEpisodeInsertV4,
  EpisodeInsertV4,
} from '../episode/v4/schema.js'
import type { CommentEntity } from './types.js'
import { CommentMode, normalizeCommentMode } from './types.js'
import { parseCommentEntityP } from './utils.js'

type V4CommentMode = 'ltr' | 'rtl' | 'top' | 'bottom'

const modeMap: Record<V4CommentMode, 'Normal' | 'Bottom' | 'Top' | 'Reverse'> =
  {
    ltr: 'Reverse',
    rtl: 'Normal',
    top: 'Top',
    bottom: 'Bottom',
  }

const modeReverseMap: Record<
  'Normal' | 'Bottom' | 'Top' | 'Reverse' | 'Ext',
  number
> = {
  Normal: CommentMode.rtl,
  Bottom: CommentMode.bottom,
  Top: CommentMode.top,
  Reverse: CommentMode.ltr,
  Ext: CommentMode.rtl,
}

export const V4EpisodeAdapter = defineAdapter(
  (epV4: EpisodeInsertV4 | CustomEpisodeInsertV4) => {
    return async (udb: InitedUniDB, uchunk?: UniChunk) => {
      const chunk = uchunk ?? (await udb.makeChunk({ fromConverted: true }))

      const validDanmakus: UDanmaku[] = []

      for (const comment of epV4.comments) {
        const parsed = parseCommentEntityP(comment.p)

        if (!parsed) {
          continue
        }

        const { time, mode, color, uid } = parsed

        const map_d = {
          ...defaultUniDM,
          pool: 'Def' as const,
          SOID: 'v4+danmaku-converter@danmaku-anywhere',
          progress: Math.round(time * 1000),
          mode: modeMap[mode] ?? 'Normal',
          color: hexToRgb888(color),
          senderID: uid ? `${uid}@danmaku-anywhere` : defaultUniDM.senderID,
          content: comment.m,
          ctime: new Date(),
          platform: epV4.provider,
        }

        validDanmakus.push({ ...map_d, DMID: udb.DMIDGenerator(map_d) })
      }

      await chunk.upsertDanmakus(validDanmakus)
      return chunk
    }
  }
)

export function toCommentEntity(udanmaku: UDanmaku): CommentEntity {
  const time = udanmaku.progress / 1000
  const mode = modeReverseMap[udanmaku.mode] ?? CommentMode.rtl
  const normalizedMode = normalizeCommentMode(mode)
  const color = udanmaku.color

  const senderID = udanmaku.senderID.replace('@danmaku-anywhere', '')

  const p =
    senderID && senderID !== 'anonymous@dan-uni/dan-any'
      ? `${time.toFixed(2)},${normalizedMode},${color},${senderID}`
      : `${time.toFixed(2)},${normalizedMode},${color}`

  return {
    p,
    m: udanmaku.content,
  }
}

export function toCommentEntities(udanmakus: UDanmaku[]): CommentEntity[] {
  return udanmakus.map(toCommentEntity)
}

export function toUDanmaku(
  ce: CommentEntity,
  udb: InitedUniDB,
  platform?: string
): UDanmaku | null {
  const parsed = parseCommentEntityP(ce.p)

  if (!parsed) {
    return null
  }

  const { time, mode, color, uid } = parsed

  const map_d = {
    ...defaultUniDM,
    pool: 'Def' as const,
    SOID: 'comment-entity@danmaku-anywhere',
    progress: Math.round(time * 1000),
    mode: modeMap[mode] ?? 'Normal',
    color: hexToRgb888(color),
    senderID: uid ? `${uid}@danmaku-anywhere` : defaultUniDM.senderID,
    content: ce.m,
    ctime: new Date(),
    platform: platform ?? null,
  }

  return { ...map_d, DMID: udb.DMIDGenerator(map_d) }
}
