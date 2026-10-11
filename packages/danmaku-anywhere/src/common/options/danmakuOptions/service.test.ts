import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { migrateOptions } from '@/common/options/OptionsService/migrationOptions'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type {
  PrevOptions,
  Version,
} from '@/common/options/OptionsService/types'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { defaultCollapseConfig } from './constant'
import { DanmakuOptionsService } from './service'

/**
 * Drives the real danmakuOptions upgrade chain (defined inline in
 * DanmakuOptionsService) from the shape a v1.5.0 user has stored, through
 * versions 7 to 10, and asserts the resulting fields.
 */

// Resolving the real DanmakuOptionsService registers its .version(n, ...) upgrade
// steps on a real OptionsService. Recording those calls lets the chain be
// replayed directly through migrateOptions.
function captureVersions(): Version[] {
  const register = vi.spyOn(OptionsService.prototype, 'version')
  const service = createTestContainer([backgroundContainerModule]).get(
    DanmakuOptionsService
  )
  const versions = register.mock.calls
    .filter((_, i) => register.mock.contexts[i] === service.options)
    .map(([version, config]) => ({ version, ...config }))
  register.mockRestore()
  return versions
}

function upgrade(data: PrevOptions, fromVersion: number) {
  return migrateOptions(
    { data, version: fromVersion },
    captureVersions(),
    silentLogger,
    { stores: {}, defer: () => {} }
  )
}

// The shape stored on disk right after v6 ran: nothing from v7 onward
// exists yet.
function createV6Options(overrides: Record<string, unknown> = {}) {
  return {
    filters: [{ type: 'text', value: 'spam', enabled: true }],
    trackHeight: 40,
    allowOverlap: true,
    overlap: 50,
    speed: 1.5,
    style: {
      opacity: 0.9,
      fontSize: 30,
      fontFamily: 'monospace',
    },
    maxOnScreen: 300,
    trackLimit: 16,
    area: {
      yStart: 10,
      yEnd: 90,
      xStart: 0,
      xEnd: 100,
    },
    specialComments: {
      top: 'hidden',
      bottom: 'normal',
    },
    offset: 250,
    distribution: 'order',
    interval: 400,
    ...overrides,
  }
}

describe('danmakuOptions upgrade chain (v7 to v10)', () => {
  it('reaches v10 with all new fields defaulted', () => {
    const result = upgrade(createV6Options(), 6)

    expect(result.version).toBe(10)
    expect(result.data.customCss).toBe('')
    expect(result.data.useCustomCss).toBe(false)
    expect(result.data.collapse).toEqual(defaultCollapseConfig)
    expect(result.data.occlusion).toBe(false)
    expect(result.data.occlusionModel).toBe('people')
    expect(result.data.occlusionConfidence).toBe(0.5)
    expect(result.data.occlusionEdgeSoftness).toBe(1)
    expect(result.data.occlusionQuality).toBe('medium')
  })

  it('drops the short-lived v8 dedup field by the time it reaches v10', () => {
    const result = upgrade(createV6Options(), 6)

    expect('dedup' in result.data).toBe(false)
  })

  it('preserves pre-existing user values across the chain', () => {
    const result = upgrade(createV6Options(), 6)

    expect(result.data.filters).toEqual([
      { type: 'text', value: 'spam', enabled: true },
    ])
    expect(result.data.trackHeight).toBe(40)
    expect(result.data.allowOverlap).toBe(true)
    expect(result.data.speed).toBe(1.5)
    expect(result.data.style).toEqual({
      opacity: 0.9,
      fontSize: 30,
      fontFamily: 'monospace',
    })
    expect(result.data.area).toEqual({
      yStart: 10,
      yEnd: 90,
      xStart: 0,
      xEnd: 100,
    })
    expect(result.data.specialComments).toEqual({
      top: 'hidden',
      bottom: 'normal',
    })
    expect(result.data.offset).toBe(250)
    expect(result.data.distribution).toBe('order')
    expect(result.data.interval).toBe(400)
  })

  it('handles a partial shape where interval (v6) is missing without throwing', () => {
    const data = createV6Options()
    delete (data as Record<string, unknown>).interval

    expect(() => upgrade(data, 6)).not.toThrow()

    const result = upgrade(data, 6)
    expect(result.version).toBe(10)
    expect(result.data.occlusionQuality).toBe('medium')
  })
})
