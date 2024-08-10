import type { DanDanComment } from '@danmaku-anywhere/danmaku-provider/ddp'
import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { importCommentSchema, importDanmakuSchema } from './import'

import type {
  CustomDanmakuCacheImportDto,
  DDPDanmakuCacheImportDto,
} from '@/common/danmaku/models/danmakuCache/dto'

const validComment: DanDanComment = {
  cid: 1722521763,
  p: '0.01,1,16777215,[Gamer]hui0810yong',
  m: '簽',
}

const ddpDanmaku: DDPDanmakuCacheImportDto = {
  comments: [
    {
      cid: 1722521763,
      p: '0.01,1,16777215,[Gamer]hui0810yong',
      m: '簽',
    },
  ],
  meta: {
    animeId: 18317,
    animeTitle: '败犬女主太多了！',
    episodeId: 183170003,
    episodeTitle: '第3话 还没上场就输了',
    type: 1,
  },
  params: {
    chConvert: 0,
    withRelated: true,
    from: 0,
  },
  timeUpdated: 1722560604397,
  version: 1,
  type: 1,
}

const customDanmaku: CustomDanmakuCacheImportDto = {
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

describe('danmakuCacheSchemaOne', () => {
  it('accepts valid DDP danmaku', () => {
    const res = importDanmakuSchema.parse([ddpDanmaku])

    expect(res).toEqual([ddpDanmaku])
  })

  it('accepts valid custom danmaku', () => {
    const res = importDanmakuSchema.parse([customDanmaku])

    expect(res).toEqual([customDanmaku])
  })
})
