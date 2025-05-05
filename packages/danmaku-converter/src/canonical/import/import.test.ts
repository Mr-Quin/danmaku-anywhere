import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { parseBackup } from './import.js'

import validCommentData from './test-data/common/validComment.json' with {
  type: 'json',
}
import v1CustomData from './test-data/v1/custom.json' with { type: 'json' }
import v1DanDanPlayData from './test-data/v1/danDanPlay.json' with {
  type: 'json',
}
import v2BilibiliData from './test-data/v2/bilibili.json' with { type: 'json' }
import v2CustomData from './test-data/v2/custom.json' with { type: 'json' }
import v2DanDanPlayData from './test-data/v2/danDanPlay.json' with {
  type: 'json',
}
import v2TencentData from './test-data/v2/tencent.json' with { type: 'json' }
import v3BilibiliData from './test-data/v3/bilibili.json' with { type: 'json' }
import v3CustomData from './test-data/v3/custom.json' with { type: 'json' }
import v3DanDanPlayData from './test-data/v3/danDanPlay.json' with {
  type: 'json',
}
import v3TencentData from './test-data/v3/tencent.json' with { type: 'json' }

import customV4EpisodeData from './test-data/v4/customEpisodeV4.json' with {
  type: 'json',
}
import invalidV4Data from './test-data/v4/invalidData.json' with {
  type: 'json',
}
import regularV4EpisodeData from './test-data/v4/regularEpisodeWithSeasonV4.json' with {
  type: 'json',
}

import { zCommentImport } from '../comment'
import { DanmakuSourceType } from '../provider/provider'

describe('commentSchema', () => {
  it('accepts valid comment', () => {
    const result = zCommentImport.parse(validCommentData)
    expect(result).toEqual(validCommentData)

    const removedCid = produce<any>(validCommentData, (draft) => {
      delete draft.cid
    })

    expect(zCommentImport.parse(removedCid)).toEqual({
      ...removedCid,
      cid: undefined,
    })
  })

  it('rejects comment with missing properties', () => {
    const noM = produce<any>(validCommentData, (draft) => {
      delete draft.p
    })
    const noP = produce<any>(validCommentData, (draft) => {
      delete draft.p
    })
    expect(() => zCommentImport.parse(noM)).toThrow()
    expect(() => zCommentImport.parse(noP)).toThrow()
  })

  it('rejects comment with invalid properties', () => {
    const invalidP = produce<any>(validCommentData, (draft) => {
      draft.p = 'invalid'
    })
    const invalidTime = produce<any>(validCommentData, (draft) => {
      draft.p = '-1,1,16777215'
    })
    const invalidColor = produce<any>(validCommentData, (draft) => {
      draft.p = '0.00,1,abcde'
    })
    expect(() => zCommentImport.parse(invalidP)).toThrow()
    expect(() => zCommentImport.parse(invalidTime)).toThrow()
    expect(() => zCommentImport.parse(invalidColor)).toThrow()
  })
})

// Updated assert function for the `imported` array structure
function assertIsImportedDataArray(input: any): asserts input is Array<{
  type: 'Custom' | 'Regular'
  episode: any
  season?: any
}> {
  expect(Array.isArray(input)).toBe(true)
  for (const [, item] of input) {
    expect(item).toHaveProperty('type')
    expect(item).toHaveProperty('episode')
    expect(item.episode).toBeTypeOf('object')
    if (item.type === 'Regular') {
      expect(item).toHaveProperty('season')
      expect(item.season).toBeTypeOf('object')
    } else {
      expect(item.type).toBe('Custom')
      expect(item).not.toHaveProperty('season')
    }
  }
}

describe('importBackup with legacy data (V1-V3)', () => {
  describe('v1', () => {
    it('accepts valid DDP danmaku', () => {
      const result = parseBackup([v1DanDanPlayData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.DanDanPlay)
    })

    it('accepts valid custom danmaku', () => {
      const result = parseBackup([v1CustomData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Custom')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Custom)
    })
  })

  describe('v2', () => {
    it('accepts valid DDP danmaku', () => {
      const result = parseBackup([v2DanDanPlayData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.DanDanPlay)
    })

    it('accepts valid custom danmaku', () => {
      const result = parseBackup([v2CustomData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Custom')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Custom)
    })

    it('accepts valid bilibili danmaku', () => {
      const result = parseBackup([v2BilibiliData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Bilibili)
    })

    it('accepts valid tencent danmaku', () => {
      const result = parseBackup([v2TencentData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Tencent)
    })
  })

  describe('v3', () => {
    it('accepts valid DDP danmaku', () => {
      const result = parseBackup([v3DanDanPlayData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      if (importedItem.type !== 'Regular') throw new Error('Unexpected type')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.DanDanPlay)
      expect(importedItem.episode.title).toBe(v3DanDanPlayData.episodeTitle)
      // Ensure season is present and its title matches
      expect(importedItem.season?.title).toBe(v3DanDanPlayData.seasonTitle)
    })

    it('accepts valid custom danmaku', () => {
      const result = parseBackup([v3CustomData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Custom')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Custom)
      // v3CustomData.episodeTitle is "", meta.episodeTitle is "第3话 还没上场就输了"
      // customV3ToV4 uses item.episodeTitle, so it should be ""
      expect(importedItem.episode.title).toBe(v3CustomData.episodeTitle)
    })

    it('accepts valid bilibili danmaku', () => {
      const result = parseBackup([v3BilibiliData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      if (importedItem.type !== 'Regular') throw new Error('Unexpected type')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Bilibili)
      expect(importedItem.episode.title).toBe(v3BilibiliData.episodeTitle)
      expect(importedItem.season?.title).toBe(v3BilibiliData.seasonTitle)
    })

    it('accepts valid tencent danmaku', () => {
      const result = parseBackup([v3TencentData])
      expect(result.imported).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
      assertIsImportedDataArray(result.imported)
      const [, importedItem] = result.imported[0]
      expect(importedItem.type).toBe('Regular')
      if (importedItem.type !== 'Regular') throw new Error('Unexpected type')
      expect(importedItem.episode.provider).toBe(DanmakuSourceType.Tencent)
      expect(importedItem.episode.title).toBe(v3TencentData.episodeTitle)
      expect(importedItem.season?.title).toBe(v3TencentData.seasonTitle)
    })
  })
})

describe('importBackup with V4 and mixed data', () => {
  it('should correctly import valid V3 DanDanPlay data array', () => {
    const backupResult = parseBackup([v3DanDanPlayData])

    expect(backupResult.imported).toHaveLength(1)
    expect(backupResult.skipped).toHaveLength(0)
    const [, importedItem] = backupResult.imported[0]
    expect(importedItem.type).toBe('Regular')
    expect(importedItem.episode.provider).toBe(DanmakuSourceType.DanDanPlay)
  })

  it('should correctly import valid V3 Custom data array', () => {
    const backupResult = parseBackup([v3CustomData])

    expect(backupResult.imported).toHaveLength(1)
    expect(backupResult.skipped).toHaveLength(0)
    const [, importedItem] = backupResult.imported[0]
    expect(importedItem.type).toBe('Custom')
    expect(importedItem.episode.provider).toBe(DanmakuSourceType.Custom)
  })

  it('should correctly import valid V4 CustomEpisode data array', () => {
    const backupResult = parseBackup([customV4EpisodeData])

    expect(backupResult.imported).toHaveLength(1)
    expect(backupResult.skipped).toHaveLength(0)
    const [, importedItem] = backupResult.imported[0]
    expect(importedItem.type).toBe('Custom')
    expect(importedItem.episode.provider).toBe(DanmakuSourceType.Custom)
    expect(importedItem.episode.title).toBe(customV4EpisodeData.title)
    expect(importedItem.episode.schemaVersion).toBe(4)
    expect(importedItem.episode.comments).toEqual(customV4EpisodeData.comments)
  })

  it('should correctly import valid V4 Regular Episode with Season data array', () => {
    const backupResult = parseBackup([regularV4EpisodeData])
    expect(backupResult.imported).toHaveLength(1)
    expect(backupResult.skipped).toHaveLength(0)
    const [, importedItem] = backupResult.imported[0]
    expect(importedItem.type).toBe('Regular')
    if (importedItem.type !== 'Regular') throw new Error('Unexpected type')

    expect(importedItem.episode.provider).toBe(DanmakuSourceType.DanDanPlay) // From our sample regularV4EpisodeData
    expect(importedItem.episode.title).toBe(regularV4EpisodeData.title)
    expect(importedItem.episode.schemaVersion).toBe(4)
    expect(importedItem.season?.title).toBe(regularV4EpisodeData.season.title)
    expect(importedItem.season?.schemaVersion).toBe(1)
  })

  it('should skip invalid data in an array', () => {
    const backupResult = parseBackup([invalidV4Data])
    expect(backupResult.imported).toHaveLength(0)
    expect(backupResult.skipped).toEqual([0]) // Index of the skipped item
  })

  it('should skip completely invalid non-object data in an array', () => {
    const backupResult = parseBackup(['not an object'])
    expect(backupResult.imported).toHaveLength(0)
    expect(backupResult.skipped).toEqual([0])
  })

  it('should handle an empty array input', () => {
    const backupResult = parseBackup([])
    expect(backupResult.imported).toHaveLength(0)
    expect(backupResult.skipped).toHaveLength(0)
  })

  it('should handle a mix of valid and invalid data', () => {
    const backupResult = parseBackup([
      v3DanDanPlayData, // valid
      invalidV4Data, // invalid
      customV4EpisodeData, // valid
      'not an object', // invalid
      v3CustomData, // valid
    ])
    expect(backupResult.imported).toHaveLength(3)
    expect(backupResult.skipped).toEqual([1, 3]) // Indices of invalidData and "not an object"

    assertIsImportedDataArray(backupResult.imported)

    // Check first imported item (v3DanDanPlayData)
    expect(backupResult.imported[0].type).toBe('Regular')
    expect(backupResult.imported[0].episode.provider).toBe(
      DanmakuSourceType.DanDanPlay
    )
    expect(backupResult.imported[0].episode.title).toBe(
      v3DanDanPlayData.episodeTitle
    )

    // Check second imported item (customV4EpisodeData)
    expect(backupResult.imported[1].type).toBe('Custom')
    expect(backupResult.imported[1].episode.title).toBe(
      customV4EpisodeData.title
    )

    // Check third imported item (v3CustomData)
    expect(backupResult.imported[2].type).toBe('Custom')
    expect(backupResult.imported[2].episode.title).toBe(
      v3CustomData.episodeTitle
    )
  })
})
