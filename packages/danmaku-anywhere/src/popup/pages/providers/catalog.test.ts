import type { ConfigSchema } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import {
  checkedAgo,
  createConfigFromManifest,
  flattenUnits,
  groupInstalled,
  installedUpdates,
  isHostedDanDanPlay,
  manifestNeedsConfigForm,
  matchesQuery,
} from './catalog'

/**
 * Catalog import builds a ProviderConfig from a registered manifest. Asserts
 * the config references the manifest, defaults its values from the manifest's
 * configSchema, and that the form is only required when a required field has
 * no default to fall back on.
 */

const manifest: ProviderManifestInfo = {
  id: 'iqiyi',
  name: 'iQIYI',
  version: '0.3.0',
  kind: 'preinstalled',
}

describe('createConfigFromManifest', () => {
  it('references the manifest', () => {
    const config = createConfigFromManifest(manifest)
    expect(config.manifestId).toBe('iqiyi')
    expect(config.name).toBe('iQIYI')
    expect(config.enabled).toBe(true)
    expect(config.id).toBeTruthy()
  })

  it('defaults configValues from the configSchema', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        stripColor: { type: 'boolean', default: true },
      },
    }
    const config = createConfigFromManifest({
      ...manifest,
      configSchema: schema,
    })
    expect(config.configValues).toEqual({ stripColor: true })
  })

  it('uses an empty config object when the manifest has no schema', () => {
    expect(createConfigFromManifest(manifest).configValues).toEqual({})
  })
})

describe('manifestNeedsConfigForm', () => {
  it('is false when there is no schema', () => {
    expect(manifestNeedsConfigForm(undefined)).toBe(false)
  })

  it('is false when required fields carry defaults', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        baseUrl: { type: 'string', default: 'https://example.com' },
      },
      required: ['baseUrl'],
    }
    expect(manifestNeedsConfigForm(schema)).toBe(false)
  })

  it('is false when fields without defaults are optional', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        baseUrl: { type: 'string' },
      },
    }
    expect(manifestNeedsConfigForm(schema)).toBe(false)
  })

  it('is true when a required field has no default', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: {
        baseUrl: { type: 'string' },
      },
      required: ['baseUrl'],
    }
    expect(manifestNeedsConfigForm(schema)).toBe(true)
  })
})

function cfg(id: string, manifestId: string): ProviderConfig {
  return {
    id,
    manifestId,
    name: id,
    enabled: true,
    configValues: {},
  }
}

describe('isHostedDanDanPlay', () => {
  it('is true only for a dandanplay config on the hosted proxy', () => {
    const hosted = {
      ...cfg('proxy', 'dandanplay'),
      configValues: { baseUrl: PROXY_DDP_BASE_URL },
    }
    expect(isHostedDanDanPlay(hosted)).toBe(true)
  })

  it('is false for a user server or another manifest', () => {
    expect(
      isHostedDanDanPlay({
        ...cfg('home', 'dandanplay'),
        configValues: { baseUrl: 'https://ddp.home.example' },
      })
    ).toBe(false)
    expect(isHostedDanDanPlay(cfg('b', 'bilibili'))).toBe(false)
  })
})

describe('groupInstalled', () => {
  it('keeps single-config manifests as flat rows', () => {
    const units = groupInstalled([cfg('a', 'bilibili'), cfg('b', 'tencent')])
    expect(units.map((u) => u.type)).toEqual(['single', 'single'])
  })

  it('groups a multi-instance manifest even with a single config', () => {
    const units = groupInstalled([cfg('proxy', 'dandanplay')])
    expect(units).toHaveLength(1)
    expect(units[0].type).toBe('group')
  })

  it('groups multiple dandanplay configs anchored at the first position', () => {
    const units = groupInstalled([
      cfg('proxy', 'dandanplay'),
      cfg('bili', 'bilibili'),
      cfg('home', 'dandanplay'),
    ])
    expect(units.map((u) => u.type)).toEqual(['group', 'single'])
    const group = units[0]
    if (group.type !== 'group') {
      throw new Error('expected a group')
    }
    expect(group.configs.map((c) => c.id)).toEqual(['proxy', 'home'])
  })

  it('flattenUnits restores a flat config list in display order', () => {
    const configs = [
      cfg('proxy', 'dandanplay'),
      cfg('bili', 'bilibili'),
      cfg('home', 'dandanplay'),
    ]
    const flat = flattenUnits(groupInstalled(configs)).map((c) => c.id)
    expect(flat).toEqual(['proxy', 'home', 'bili'])
  })
})

describe('matchesQuery', () => {
  it('matches everything when the query is empty or whitespace', () => {
    expect(matchesQuery('', 'iQIYI', 'iqiyi')).toBe(true)
    expect(matchesQuery('   ', 'iQIYI', 'iqiyi')).toBe(true)
  })

  it('matches case-insensitively against any field', () => {
    expect(matchesQuery('IQIYI', 'iQIYI', 'iqiyi')).toBe(true)
    expect(matchesQuery('iqi', 'Some Name', 'iqiyi')).toBe(true)
  })

  it('is false when no field contains the query', () => {
    expect(matchesQuery('bilibili', 'iQIYI', 'iqiyi')).toBe(false)
  })
})

describe('checkedAgo', () => {
  const now = 10 * 24 * 60 * 60 * 1000

  it('reports never when there is no timestamp', () => {
    expect(checkedAgo(null, now)).toEqual({ unit: 'never' })
  })

  it('buckets sub-minute as just now', () => {
    expect(checkedAgo(now - 30_000, now)).toEqual({ unit: 'justNow' })
  })

  it('buckets minutes, hours, and days', () => {
    expect(checkedAgo(now - 5 * 60_000, now)).toEqual({
      unit: 'minutes',
      count: 5,
    })
    expect(checkedAgo(now - 3 * 60 * 60_000, now)).toEqual({
      unit: 'hours',
      count: 3,
    })
    expect(checkedAgo(now - 2 * 24 * 60 * 60_000, now)).toEqual({
      unit: 'days',
      count: 2,
    })
  })
})

describe('installedUpdates', () => {
  const update = (manifestId: string) => ({
    manifestId,
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
  })

  it('keeps only updates whose manifest is installed', () => {
    const updates = [update('bilibili'), update('iqiyi'), update('tencent')]
    const installed = new Set(['bilibili', 'tencent'])
    expect(installedUpdates(updates, installed)).toEqual([
      update('bilibili'),
      update('tencent'),
    ])
  })

  it('returns nothing when no update targets an installed source', () => {
    expect(installedUpdates([update('iqiyi')], new Set(['bilibili']))).toEqual(
      []
    )
  })
})
