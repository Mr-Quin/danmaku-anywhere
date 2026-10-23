import type { ConfigSchema } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import {
  effectiveConfigValues,
  isBuiltinConfig,
  lockedConfigKeys,
  withoutLockedValues,
} from './builtin'
import { PROXY_DDP_BASE_URL } from './constant'
import type { ProviderConfig } from './schema'
import { checkProviderConfig, LEGACY_MACCMS_CONFIG_SCHEMA } from './validation'

/**
 * checkProviderConfig is the rule set the writer applies to every write and
 * restore, and the editor applies before saving: config values, as the
 * provider would run with them, against the manifest's configSchema when it
 * is known, and a name for a source that has no default one. Settings the
 * extension owns on a built-in are never stored and always supplied.
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
  configValues: { chConvert: 0 },
}

describe('checkProviderConfig', () => {
  it('passes a valid new config', () => {
    expect(
      checkProviderConfig({
        config: {
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
      config: {
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { chConvert: 5 },
      },
      configSchema: ddpSchema,
    })

    expect(issues.map((issue) => issue.kind)).toEqual(['config', 'config'])
  })

  it('checks a built-in with the server the extension supplies', () => {
    expect(
      checkProviderConfig({ config: builtinDdp, configSchema: ddpSchema })
    ).toEqual([])
  })

  it('leaves the values of a source with no known schema unchecked', () => {
    expect(
      checkProviderConfig({
        config: { ...builtinDdp, id: 'x', manifestId: 'not-installed' },
        configSchema: undefined,
      })
    ).toEqual([])
  })

  it('requires a name for legacy MacCMS, which has no default one', () => {
    const issues = checkProviderConfig({
      config: {
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

describe('built-in settings the extension owns', () => {
  it('are dropped from what a built-in stores and supplied when it runs', () => {
    const stored = withoutLockedValues({
      ...builtinDdp,
      configValues: {
        baseUrl: 'https://elsewhere.example',
        auth: { enabled: true, headers: [] },
        chConvert: 1,
      },
    })

    expect(stored.configValues).toEqual({ chConvert: 1 })
    expect(effectiveConfigValues(stored)).toEqual({
      chConvert: 1,
      baseUrl: PROXY_DDP_BASE_URL,
    })
  })

  it('stay with a custom instance as it set them', () => {
    const custom = {
      ...builtinDdp,
      id: 'custom-1',
      configValues: { baseUrl: 'https://mine.example' },
    }

    expect(withoutLockedValues(custom)).toBe(custom)
    expect(effectiveConfigValues(custom)).toEqual({
      baseUrl: 'https://mine.example',
    })
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
