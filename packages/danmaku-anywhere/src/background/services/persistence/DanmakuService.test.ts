import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { silentLogger } from '@/tests/silentLogger'
import { DanmakuService } from './DanmakuService'
import { SeasonService } from './SeasonService'

/**
 * Importing local danmaku files into custom episodes. A file whose title and
 * comments match an existing custom episode is reported as already imported
 * instead of being added again, whether it arrives as a plain danmaku file or
 * inside a danmaku backup. Same-title files with different comments still
 * import.
 */

function comments(...texts: string[]) {
  return texts.map((text, i) => ({ p: `${i + 1},1,16777215`, m: text }))
}

describe('DanmakuService.import', () => {
  let db: DanmakuAnywhereDb
  let service: DanmakuService

  beforeEach(async () => {
    await Dexie.delete(DANMAKU_DB_NAME)
    db = new DanmakuAnywhereDb()
    await db.open()
    service = new DanmakuService(new SeasonService(db), db, silentLogger)
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(DANMAKU_DB_NAME)
  })

  it('skips files that were already imported', async () => {
    const folder = [
      { title: '/show/01.json', data: comments('a', 'b') },
      { title: '/show/02.json', data: comments('c') },
      { title: '/show/03.json', data: comments('d', 'e', 'f') },
    ]

    const first = await service.import(folder)
    const second = await service.import(folder)
    const third = await service.import(folder)

    expect(first.success).toHaveLength(3)
    expect(first.alreadyImported).toEqual([])
    expect(second.success).toEqual([])
    expect(second.alreadyImported.map((item) => item.title)).toEqual([
      '/show/01.json',
      '/show/02.json',
      '/show/03.json',
    ])
    expect(third.alreadyImported).toHaveLength(3)
    expect(await db.customEpisode.count()).toBe(3)
  })

  it('imports a file with a known title but different comments', async () => {
    await service.import([{ title: '01.json', data: comments('a') }])

    const result = await service.import([
      { title: '01.json', data: comments('something else') },
    ])

    expect(result.success).toEqual([{ type: 'Custom', title: '01.json' }])
    expect(result.alreadyImported).toEqual([])
    expect(await db.customEpisode.count()).toBe(2)
  })

  it('skips a duplicate within the same import', async () => {
    const file = { title: '01.json', data: comments('a') }

    const result = await service.import([file, file])

    expect(result.success).toHaveLength(1)
    expect(result.alreadyImported).toEqual([{ title: '01.json' }])
    expect(await db.customEpisode.count()).toBe(1)
  })

  it('skips custom episodes from a backup that are already in the library', async () => {
    await service.import([{ title: '01.json', data: comments('a', 'b') }])
    const [stored] = await db.customEpisode.toArray()

    const result = await service.import([
      { title: 'backup.json', data: [stored] },
    ])

    expect(result.alreadyImported).toEqual([{ title: '01.json' }])
    expect(await db.customEpisode.count()).toBe(1)
  })
})
