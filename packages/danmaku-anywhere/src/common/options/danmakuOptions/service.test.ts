import { beforeEach, describe, expect, it } from 'vitest'
import {
  defaultCollapseConfig,
  defaultDanmakuOptions,
} from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { createOptionsContainer, optionsStorage } from '@/tests/optionsStore'

/**
 * Danmaku options migrate in place through ten version steps, several of which
 * delete fields as well as add them. Each step is asserted on the fields it
 * owns. A step that throws on a stale shape has to land the store on defaults
 * rather than a half-migrated mix of old and new fields.
 */

const LATEST_VERSION = 10

const { seed, read: readStored } =
  optionsStorage<Record<string, unknown>>('danmakuOptions')

let service: DanmakuOptionsService

beforeEach(() => {
  service = createOptionsContainer().get(DanmakuOptionsService)
})

describe('DanmakuOptionsService migrations', () => {
  it('seeds defaults at the latest version when nothing is stored', async () => {
    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(data).toEqual(defaultDanmakuOptions)
    expect(version).toBe(LATEST_VERSION)
  })

  it('adds safe zones and offset at version 2', async () => {
    await seed({ style: {} }, 1)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.safeZones).toEqual({ top: 0, bottom: 0, left: 0, right: 0 })
    expect(data.offset).toBe(0)
  })

  it('drops show and filterLevel for limitPerSec at version 3', async () => {
    await seed({ show: true, filterLevel: 2 }, 2)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data).not.toHaveProperty('show')
    expect(data).not.toHaveProperty('filterLevel')
    expect(data.limitPerSec).toBe(10)
  })

  it('adds the engine layout fields at version 4', async () => {
    await seed({}, 3)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.maxOnScreen).toBe(500)
    expect(data.trackLimit).toBe(32)
    expect(data.trackHeight).toBe(32)
    expect(data.allowOverlap).toBe(false)
    expect(data.area).toEqual({ yStart: 0, yEnd: 100, xStart: 0, xEnd: 100 })
    expect(data.specialComments).toEqual({ top: 'normal', bottom: 'scroll' })
  })

  it('adds distribution, interval and the custom css pair at versions 5 to 7', async () => {
    await seed({}, 4)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.distribution).toBe('random')
    expect(data.interval).toBe(200)
    expect(data.customCss).toBe('')
    expect(data.useCustomCss).toBe(false)
  })

  it('replaces the abandoned dedup field with collapse defaults at version 9', async () => {
    await seed({ dedup: { enabled: true, tolerance: 0.5, whitelist: [] } }, 8)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data).not.toHaveProperty('dedup')
    expect(data.collapse).toEqual(defaultCollapseConfig)
  })

  it('adds the occlusion fields at version 10', async () => {
    await seed({}, 9)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(version).toBe(LATEST_VERSION)
    expect(data.occlusion).toBe(false)
    expect(data.occlusionModel).toBe('people')
    expect(data.occlusionConfidence).toBe(0.5)
    expect(data.occlusionEdgeSoftness).toBe(1)
    expect(data.occlusionQuality).toBe('medium')
  })

  it('carries a user style through every step untouched', async () => {
    const style = { fontSize: 18, opacity: 0.8 }
    await seed({ style }, 1)

    await service.options.upgrade()

    const { data } = await readStored()
    expect(data.style).toEqual(style)
  })

  it('resets the whole store to defaults when a step throws on a stale shape', async () => {
    await seed(null, 3)

    await service.options.upgrade()

    const { data, version } = await readStored()
    expect(data).toEqual(defaultDanmakuOptions)
    expect(version).toBe(LATEST_VERSION)
  })
})
