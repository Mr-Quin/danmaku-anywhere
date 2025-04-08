import { describe, expect, it } from 'vitest'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  BiliBiliDanmakuV3,
  CustomDanmakuV3,
  DanDanPlayDanmakuV3,
  TencentDanmakuV3,
} from '@/common/danmaku/types/v3/schema'
import { episodeV4Migration } from './migration'

const sampleDanDanPlayV3: DanDanPlayDanmakuV3 = {
  id: 1,
  provider: DanmakuSourceType.DanDanPlay,
  episodeId: 183170003,
  episodeTitle: '第3话 还没上场就输了',
  seasonId: 18317,
  seasonTitle: '败犬女主太多了！',
  comments: [
    {
      cid: 1722521763,
      p: '0.01,1,16777215,[Gamer]hui0810yong',
      m: '簽',
    },
  ],
  commentCount: 1,
  meta: {
    provider: DanmakuSourceType.DanDanPlay,
    episodeId: 179810001,
    animeId: 17981,
    episodeTitle: '第1话 羽丘的怪女孩',
    animeTitle: 'BanG Dream! It`s MyGO!!!!!',
  },
  params: {
    chConvert: 0,
    withRelated: true,
    from: 0,
  },
  timeUpdated: 1722560604397,
  version: 1,
  schemaVersion: 3,
}

const sampleBilibiliV3: BiliBiliDanmakuV3 = {
  id: 2,
  provider: DanmakuSourceType.Bilibili,
  episodeId: 1722521763,
  episodeTitle: '第3话 还没上场就输了',
  seasonId: 18317,
  seasonTitle: '败犬女主太多了！',
  comments: [
    {
      cid: 1722521763,
      p: '0.01,1,16777215,[Gamer]hui0810yong',
      m: '簽',
    },
  ],
  commentCount: 1,
  meta: {
    provider: DanmakuSourceType.Bilibili,
    cid: 1722521763,
    bvid: 'BV1Kz4y1A7zZ',
    aid: 10000,
    seasonId: 18317,
    title: '第3话 还没上场就输了',
    seasonTitle: '败犬女主太多了！',
    mediaType: 1,
  },
  timeUpdated: 1722560604397,
  version: 1,
  schemaVersion: 3,
}

const sampleTencentV3: TencentDanmakuV3 = {
  id: 3,
  provider: DanmakuSourceType.Tencent,
  comments: [
    {
      p: '0,1,16766208',
      m: '李白：拔剑四顾心茫然[6周年][6周年][6周年][6周年][6周年]',
    },
  ],
  commentCount: 53511,
  meta: {
    provider: DanmakuSourceType.Tencent,
    vid: 'i0032qxbi2v',
    episodeTitle: '庆余年 第01集',
    cid: 'rjae621myqca41h',
    seasonTitle: '庆余年',
  },
  episodeId: 'i0032qxbi2v',
  episodeTitle: '庆余年 第01集',
  seasonId: 'rjae621myqca41h',
  seasonTitle: '庆余年',
  timeUpdated: 1725848209085,
  version: 1,
  schemaVersion: 3,
}

const sampleCustomV3: CustomDanmakuV3 = {
  id: 4,
  provider: DanmakuSourceType.Custom,
  episodeTitle: '第3话 还没上场就输了',
  seasonTitle: '败犬女主太多了！',
  comments: [
    {
      cid: 1722521763,
      p: '0.01,1,16777215,[Gamer]hui0810yong',
      m: '簽',
    },
  ],
  commentCount: 1,
  meta: {
    provider: DanmakuSourceType.Custom,
    seasonTitle: '败犬女主太多了！',
    episodeTitle: '第3话 还没上场就输了',
  },
  timeUpdated: 1722560604397,
  version: 1,
  schemaVersion: 3,
}

describe('episodeV4Migration', () => {
  describe('migrateV3ToV4', () => {
    it('should correctly migrate DanDanPlay danmaku from v3 to v4', () => {
      const seasonId = 100
      const result = episodeV4Migration.migrateV3ToV4(
        sampleDanDanPlayV3,
        seasonId
      )

      expect(result).toEqual({
        provider: 'DanDanPlay',
        seasonId,
        title: sampleDanDanPlayV3.episodeTitle,
        providerIds: {
          episodeId: sampleDanDanPlayV3.meta.episodeId,
        },
        indexedId: sampleDanDanPlayV3.meta.animeId.toString(),
        params: sampleDanDanPlayV3.params,
        comments: sampleDanDanPlayV3.comments,
        commentCount: sampleDanDanPlayV3.commentCount,
        version: sampleDanDanPlayV3.version,
        timeUpdated: sampleDanDanPlayV3.timeUpdated,
        lastChecked: expect.any(Number),
        schemaVersion: 4,
      })
    })

    it('should correctly migrate Bilibili danmaku from v3 to v4', () => {
      const seasonId = 200
      const result = episodeV4Migration.migrateV3ToV4(
        sampleBilibiliV3,
        seasonId
      )

      expect(result).toEqual({
        provider: 'Bilibili',
        seasonId,
        title: sampleBilibiliV3.meta.title,
        providerIds: {
          cid: sampleBilibiliV3.meta.cid,
          aid: sampleBilibiliV3.meta.aid,
          bvid: sampleBilibiliV3.meta.bvid,
        },
        indexedId: sampleBilibiliV3.meta.cid.toString(),
        comments: sampleBilibiliV3.comments,
        commentCount: sampleBilibiliV3.commentCount,
        version: sampleBilibiliV3.version,
        timeUpdated: sampleBilibiliV3.timeUpdated,
        lastChecked: expect.any(Number),
        schemaVersion: 4,
      })
    })

    it('should correctly migrate Tencent danmaku from v3 to v4', () => {
      const seasonId = 300
      const result = episodeV4Migration.migrateV3ToV4(sampleTencentV3, seasonId)

      expect(result).toEqual({
        provider: 'Tencent',
        seasonId,
        title: sampleTencentV3.episodeTitle,
        providerIds: {
          vid: sampleTencentV3.meta.vid,
        },
        indexedId: sampleTencentV3.meta.vid.toString(),
        comments: sampleTencentV3.comments,
        commentCount: sampleTencentV3.commentCount,
        version: sampleTencentV3.version,
        timeUpdated: sampleTencentV3.timeUpdated,
        lastChecked: expect.any(Number),
        schemaVersion: 4,
      })
    })
  })

  describe('migrateCustomV3ToV4', () => {
    it('should correctly migrate Custom danmaku from v3 to v4', () => {
      const result = episodeV4Migration.migrateCustomV3ToV4(sampleCustomV3)

      expect(result).toEqual({
        provider: 'Custom',
        title: sampleCustomV3.episodeTitle,
        comments: sampleCustomV3.comments,
        commentCount: sampleCustomV3.commentCount,
        version: sampleCustomV3.version,
        timeUpdated: sampleCustomV3.timeUpdated,
        schemaVersion: 4,
      })
    })
  })
})
