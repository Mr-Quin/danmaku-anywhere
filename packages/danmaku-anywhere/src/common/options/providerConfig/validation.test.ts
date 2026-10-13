import type { ConfigSchema } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { isBuiltinConfig, lockedConfigKeys } from './builtin'
import type { ProviderConfig } from './schema'
import { checkProviderConfig, LEGACY_MACCMS_CONFIG_SCHEMA } from './validation'

/**
 * checkProviderConfig is the rule set the background applies to every write
 * and the editor applies before saving: config values against the manifest's
 * configSchema, a built-in's locked settings unchanged by an edit, and a name
 * for a source that has no default one.
 */

const ddpSchema: ConfigSchema = {
  type: 'object',
  anyOf: [{ required: ['baseUrl'] }, { required: ['appId', 'appSecret'] }],
  properties: {
    baseUrl: { type: 'string' },
    appId: { type: 'string' },
    appSecret: { type: 'string' },
    chConvert: { type: 'integer', enum: [0, 1, 2] },
  },
}

const builtinDdp: ProviderConfig = {
  id: 'dandanplay',
  manifestId: 'dandanplay',
  customName: null,
  enabled: true,
  configValues: { baseUrl: 'https://proxy.example/ddp', chConvert: 0 },
}

describe('checkProviderConfig', () => {
  it('passes a valid new config', () => {
    expect(
      checkProviderConfig({
        next: {
          manifestId: 'dandanplay',
          customName: null,
          enabled: true,
          configValues: { baseUrl: 'https://ddp.example' },
        },
        configSchema: ddpSchema,
      })
    ).toEqual([])
  })

  it('reports configSchema issues', () => {
    const issues = checkProviderConfig({
      next: {
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { chConvert: 5 },
      },
      configSchema: ddpSchema,
    })

    expect(issues.map((issue) => issue.kind)).toEqual(['config', 'config'])
  })

  it('reports an edit that changes a locked setting of a built-in', () => {
    const issues = checkProviderConfig({
      current: builtinDdp,
      next: {
        ...builtinDdp,
        configValues: { baseUrl: 'https://elsewhere.example', chConvert: 0 },
      },
      configSchema: ddpSchema,
    })

    expect(issues).toEqual([{ kind: 'locked', key: 'baseUrl' }])
  })

  it('accepts an edit that leaves the locked settings as they were', () => {
    const issues = checkProviderConfig({
      current: builtinDdp,
      next: {
        ...builtinDdp,
        configValues: { ...builtinDdp.configValues, chConvert: 2 },
      },
      configSchema: ddpSchema,
    })

    expect(issues).toEqual([])
  })

  it('compares locked object settings by value', () => {
    const current = {
      ...builtinDdp,
      configValues: {
        ...builtinDdp.configValues,
        auth: { enabled: false, headers: [] },
      },
    }

    const issues = checkProviderConfig({
      current,
      next: {
        ...current,
        configValues: {
          ...current.configValues,
          auth: { headers: [], enabled: false },
        },
      },
      configSchema: ddpSchema,
    })

    expect(issues).toEqual([])
  })

  it('does not lock anything on a custom instance', () => {
    const custom = { ...builtinDdp, id: 'custom-1' }

    const issues = checkProviderConfig({
      current: custom,
      next: { ...custom, configValues: { baseUrl: 'https://other.example' } },
      configSchema: ddpSchema,
    })

    expect(issues).toEqual([])
  })

  it('requires a name for legacy MacCMS, which has no default one', () => {
    const issues = checkProviderConfig({
      next: {
        manifestId: 'legacy:maccms',
        customName: null,
        enabled: true,
        configValues: {
          danmakuBaseUrl: 'https://vod.example/danmaku',
          danmuicuBaseUrl: 'https://vod.example/danmuicu',
        },
      },
      configSchema: LEGACY_MACCMS_CONFIG_SCHEMA,
    })

    expect(issues).toEqual([{ kind: 'nameRequired' }])
  })
})

describe('lockedConfigKeys', () => {
  it('locks the server settings of the built-in DanDanPlay only', () => {
    expect([...lockedConfigKeys(builtinDdp)]).toEqual([
      'baseUrl',
      'appId',
      'appSecret',
      'auth',
    ])
    expect(lockedConfigKeys({ ...builtinDdp, id: 'custom-1' }).size).toBe(0)
    expect(
      lockedConfigKeys({ id: 'bilibili', manifestId: 'bilibili' }).size
    ).toBe(0)
  })

  it('locks nothing on a draft, which has no id yet', () => {
    expect(lockedConfigKeys({ manifestId: 'dandanplay' }).size).toBe(0)
  })
})

describe('isBuiltinConfig', () => {
  it('is true only for the config whose id is its manifest id', () => {
    expect(isBuiltinConfig(builtinDdp)).toBe(true)
    expect(isBuiltinConfig({ ...builtinDdp, id: 'mirror' })).toBe(false)
  })
})
