import { describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { migrateOptions } from '@/common/options/OptionsService/migrationOptions'
import type { IOptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import type {
  PrevOptions,
  Version,
  VersionConfig,
} from '@/common/options/OptionsService/types'
import { MountConfigService } from './service'

/**
 * Drives the real mountConfig upgrade chain (defined inline in
 * MountConfigService) against corrupted/non-array stored shapes, to prove
 * that one bad record no longer costs the user every mount config.
 */

function createLogger(): ILogger {
  const logger = {
    sub: () => logger,
    debug: vi.fn(),
    error: vi.fn(),
  }
  return logger as unknown as ILogger
}

// Constructing MountConfigService registers its real .version(n, ...)
// upgrade steps against this recorder instead of a live OptionsService, so
// the chain can be replayed directly through migrateOptions.
function captureVersions(): Version[] {
  const versions: Version[] = []
  const chainable = {
    version(version: number, config: VersionConfig) {
      versions.push({ version, ...config })
      return chainable
    },
  }
  const factory = (() => chainable) as unknown as IOptionsServiceFactory

  new MountConfigService(createLogger(), factory)

  return versions
}

function upgrade(data: PrevOptions, fromVersion: number) {
  return migrateOptions(
    { data, version: fromVersion },
    captureVersions(),
    createLogger(),
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
