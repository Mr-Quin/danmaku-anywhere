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
import { migrateMountConfigV4V5 } from './migrations/migrateMountConfigV4V5'
import { MountConfigService } from './service'

/**
 * Drives the real mountConfig upgrade chain (defined inline in
 * MountConfigService) against corrupted/non-array stored shapes, to prove
 * that one bad record no longer costs the user every mount config. The v4 to
 * v5 step treats an absent integration policy store as an empty one.
 */

// Resolving the real MountConfigService registers its .version(n, ...) upgrade
// steps on a real OptionsService. Recording those calls lets the chain be
// replayed directly through migrateOptions.
function captureVersions(): Version[] {
  const register = vi.spyOn(OptionsService.prototype, 'version')
  const service = createTestContainer([backgroundContainerModule]).get(
    MountConfigService
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
    { xpathPolicy: [] }
  )
}

describe('mountConfig upgrade chain (v1 to latest)', () => {
  it('migrates valid configs while dropping a corrupted record instead of throwing', () => {
    const validA = {
      patterns: ['https://a.example.com/*'],
      mediaQuery: 'video',
      name: 'A',
    }
    const validB = {
      patterns: ['https://b.example.com/*'],
      mediaQuery: 'video',
      name: 'plex',
    }
    const data = [validA, null, validB]

    expect(() => upgrade(data, 1)).not.toThrow()

    const result = upgrade(data, 1)
    expect(result.data).toHaveLength(2)

    const [a, b] = result.data
    expect(a.name).toBe('A')
    expect(a.enabled).toBe(false)
    expect(typeof a.id).toBe('string')
    expect('integration' in a).toBe(false)
    expect(a.mode).toBe('manual')
    expect(a.ai).toEqual({ providerId: expect.any(String) })

    expect(b.name).toBe('plex')
  })

  it('does not throw and yields an empty list when the stored value is not an array', () => {
    expect(() => upgrade(null, 1)).not.toThrow()
    expect(() => upgrade('corrupted', 1)).not.toThrow()
    expect(() => upgrade({ not: 'an array' }, 1)).not.toThrow()

    expect(upgrade(null, 1).data).toEqual([])
    expect(upgrade('corrupted', 1).data).toEqual([])
    expect(upgrade({ not: 'an array' }, 1).data).toEqual([])
  })

  it('preserves a fully valid list end to end', () => {
    const data = [
      { patterns: ['https://a.example.com/*'], mediaQuery: 'video', name: 'A' },
      { patterns: ['https://b.example.com/*'], mediaQuery: 'video', name: 'B' },
    ]

    const result = upgrade(data, 1)

    expect(result.data).toHaveLength(2)
    expect(result.data.map((c: { name: string }) => c.name)).toEqual(['A', 'B'])
  })
})

describe('migrateMountConfigV4V5', () => {
  it('keeps a config that names an integration when no policy store was stored', () => {
    const config = {
      patterns: ['https://a.example.com/*'],
      mediaQuery: 'video',
      name: 'A',
      integration: 'policy-1',
    }

    expect(migrateMountConfigV4V5([config], {})).toEqual([config])
    expect(migrateMountConfigV4V5([config], {})).toEqual(
      migrateMountConfigV4V5([config], { xpathPolicy: [] })
    )
  })
})
