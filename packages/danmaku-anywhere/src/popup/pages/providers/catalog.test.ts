import type { ConfigSchema } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import {
  checkedAgo,
  createConfigFromManifest,
  manifestNeedsConfigForm,
} from './catalog'

/**
 * Catalog import builds a ProviderConfig from a registered manifest. Asserts
 * the config is tagged with the DanDanPlay impl (never Custom, per the
 * fail-fast resolution invariant), defaults its values from the manifest's
 * configSchema, and that the form is only required when a required field has
 * no default to fall back on.
 */

const manifest: ProviderManifestInfo = {
  id: 'iqiyi',
  name: 'iQIYI',
  version: '0.3.0',
}

describe('createConfigFromManifest', () => {
  it('references the manifest and never tags impl as Custom', () => {
    const config = createConfigFromManifest(manifest)
    expect(config.manifestId).toBe('iqiyi')
    expect(config.name).toBe('iQIYI')
    expect(config.impl).toBe(DanmakuSourceType.DanDanPlay)
    expect(config.impl).not.toBe(DanmakuSourceType.Custom)
    expect(config.isBuiltIn).toBe(false)
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
