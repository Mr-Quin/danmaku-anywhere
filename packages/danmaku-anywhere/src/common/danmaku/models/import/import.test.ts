import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { importDanmakuSchema } from './import'

import type { DanmakuInsert } from '@/common/danmaku/models/danmakuCache/db'
import { importCommentSchema } from '@/common/danmaku/models/import/commentSchema'

const validComment = {
  cid: 1722521763,
  p: '0.01,1,16777215,[Gamer]hui0810yong',
  m: '簽',
}

const dandanPlayDanmakuV1 = {
  comments: [
    {
      p: '1161.43,1,16777215,[BiliBili]3001f68a',
      m: '精准踩雷',
      cid: 1707928807,
    },
  ],
  version: 1,
  timeUpdated: 1710194549057,
  params: {
    withRelated: true,
  },
  meta: {
    type: 1,
    episodeId: 179810001,
    animeId: 17981,
    episodeTitle: '第1话 羽丘的怪女孩',
    animeTitle: 'BanG Dream! It`s MyGO!!!!!',
  },
  count: 5961,
  type: 1,
}

const dandanPlayDanmakuV2 = {
  provider: 1,
  comments: [
    {
      cid: 1722521763,
      p: '0.01,1,16777215,[Gamer]hui0810yong',
      m: '簽',
    },
  ],
  commentCount: 1,
  meta: {
    provider: 1,
    seasonId: 18317,
    seasonTitle: '败犬女主太多了！',
    episodeId: 183170003,
    episodeTitle: '第3话 还没上场就输了',
  },
  params: {
    chConvert: 0,
    withRelated: true,
    from: 0,
  },
  timeUpdated: 1722560604397,
  version: 1,
  schemaVersion: 2,
}

const customDanmakuV1 = {
  comments: [
    {
      p: '0.01,1,16777215',
      m: '簽',
    },
  ],
  meta: {
    animeTitle: '败犬女主太多了！',
    episodeTitle: '第3话 还没上场就输了',
    type: 0,
  },
  timeUpdated: 1722560604397,
  version: 1,
  type: 0,
}

describe('commentSchema', () => {
  it('accepts valid comment', () => {
    const result = importCommentSchema.parse(validComment)
    expect(result).toEqual(validComment)

    const removedCid = produce<any>(validComment, (draft) => {
      delete draft.cid
    })

    expect(importCommentSchema.parse(removedCid)).toEqual({
      ...removedCid,
      cid: undefined,
    })
  })

  it('rejects comment with missing properties', () => {
    const noM = produce<any>(validComment, (draft) => {
      delete draft.p
    })
    const noP = produce<any>(validComment, (draft) => {
      delete draft.p
    })
    expect(() => importCommentSchema.parse(noM)).toThrow()
    expect(() => importCommentSchema.parse(noP)).toThrow()
  })

  it('rejects comment with invalid properties', () => {
    const invalidP = produce<any>(validComment, (draft) => {
      draft.p = 'invalid'
    })
    const invalidTime = produce<any>(validComment, (draft) => {
      draft.p = '-1,1,16777215'
    })
    const invalidColor = produce<any>(validComment, (draft) => {
      draft.p = '0.00,1,abcde'
    })
    expect(() => importCommentSchema.parse(invalidP)).toThrow()
    expect(() => importCommentSchema.parse(invalidTime)).toThrow()
    expect(() => importCommentSchema.parse(invalidColor)).toThrow()
  })
})

function assertType(input: DanmakuInsert[]): asserts input is DanmakuInsert[] {
  return
}

describe('danmakuCacheSchemaOne', () => {
  describe('v1', () => {
    it('accepts valid DDP danmaku', () => {
      expect(() =>
        importDanmakuSchema.parse([dandanPlayDanmakuV1])
      ).not.toThrow()

      const res = importDanmakuSchema.parse([dandanPlayDanmakuV1])
      assertType(res)
    })

    it('accepts valid custom danmaku', () => {
      expect(() => importDanmakuSchema.parse([customDanmakuV1])).not.toThrow()

      const res = importDanmakuSchema.parse([customDanmakuV1])
      assertType(res)
    })
  })

  describe('v2', () => {
    it('accepts valid DDP danmaku', () => {
      expect(() =>
        importDanmakuSchema.parse([dandanPlayDanmakuV2])
      ).not.toThrow()

      const res = importDanmakuSchema.parse([dandanPlayDanmakuV2])
      assertType(res)
    })

    it('accepts valid custom danmaku', () => {
      const res = importDanmakuSchema.parse([customDanmakuV1])

      expect(res).toEqual([customDanmakuV1])
      assertType(res)
    })
  })
})
