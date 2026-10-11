import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { readV150Store } from '@/tests/v150Backup'
import { type DanmakuOptions, defaultDanmakuOptions } from './constant'
import { danmakuOptionsSchema } from './schema'
import { DanmakuOptionsService } from './service'

/**
 * Seeds chrome.storage.sync with the danmakuOptions the v1.5.0 build wrote
 * (the e2e backup fixture, version 7) and runs the real upgrade chain to the
 * current version. Asserts the user's style, filters and layout survive, the
 * short-lived dedup field is gone, and the new fields take their defaults.
 */

describe('danmakuOptions upgrade from the v1.5.0 fixture', () => {
  const fixture = readV150Store<DanmakuOptions>('danmakuOptions')
  let service: DanmakuOptionsService
  let upgraded: DanmakuOptions

  beforeEach(async () => {
    await fakeBrowser.storage.sync.set({ danmakuOptions: fixture })
    service = createUpgradeContainer().get(DanmakuOptionsService)
    await service.options.upgrade({})
    upgraded = await service.get()
  })

  it('starts from version 7 and ends at the latest version', async () => {
    expect(fixture.version).toBe(7)
    expect(await service.options.getVersion()).toBe(
      service.options.latestVersion
    )
    expect(service.options.latestVersion).toBe(10)
  })

  it('keeps the style the user set', () => {
    expect(upgraded.style).toEqual({
      fontFamily: 'sans-serif',
      fontSize: 30,
      opacity: 0.7,
    })
    expect(upgraded.customCss).toBe(fixture.data.customCss)
    expect(upgraded.useCustomCss).toBe(true)
  })

  it('keeps the filters including a disabled one', () => {
    expect(upgraded.filters).toEqual([
      { enabled: true, type: 'text', value: '剧透' },
      { enabled: false, type: 'regex', value: '^前方高能' },
    ])
  })

  it('keeps the layout and speed values', () => {
    expect(upgraded.speed).toBe(1.5)
    expect(upgraded.area).toEqual({ xEnd: 90, xStart: 10, yEnd: 60, yStart: 5 })
    expect(upgraded.specialComments).toEqual({
      bottom: 'scroll',
      top: 'normal',
    })
    expect(upgraded.trackHeight).toBe(32)
    expect(upgraded.overlap).toBe(100)
  })

  it('does not leave the dropped dedup field behind', () => {
    expect(upgraded).not.toHaveProperty('dedup')
  })

  it('seeds collapse with the default configuration', () => {
    expect(upgraded.collapse).toEqual(defaultDanmakuOptions.collapse)
  })

  it('adds the occlusion options with their defaults', () => {
    expect({
      occlusion: upgraded.occlusion,
      occlusionModel: upgraded.occlusionModel,
      occlusionConfidence: upgraded.occlusionConfidence,
      occlusionEdgeSoftness: upgraded.occlusionEdgeSoftness,
      occlusionQuality: upgraded.occlusionQuality,
    }).toEqual({
      occlusion: false,
      occlusionModel: 'people',
      occlusionConfidence: 0.5,
      occlusionEdgeSoftness: 1,
      occlusionQuality: 'medium',
    })
  })

  it('equals the stored values plus the new defaults and nothing else', () => {
    expect(upgraded).toEqual({
      ...fixture.data,
      collapse: defaultDanmakuOptions.collapse,
      occlusion: false,
      occlusionModel: 'people',
      occlusionConfidence: 0.5,
      occlusionEdgeSoftness: 1,
      occlusionQuality: 'medium',
    })
  })

  it('parses with the current schema without changing any value', () => {
    expect(danmakuOptionsSchema.parse(upgraded)).toEqual(upgraded)
  })
})
