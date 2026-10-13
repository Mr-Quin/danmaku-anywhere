import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { readV150Store } from '@/tests/v150Backup'
import { PROXY_DDP_BASE_URL } from './constant'
import type { ProviderConfig } from './schema'
import { ProviderConfigService } from './service'

/**
 * Seeds chrome.storage.sync with the providerConfig the v1.5.0 build wrote
 * (the e2e backup fixture, version 1) and runs the real ProviderConfigService
 * upgrade chain to the current version. Asserts the stored list: order, bare
 * ids, manifest ids, user values, built-ins on their default names, custom
 * sources keeping theirs, and that no legacy keys survive.
 */

const SELF_HOSTED_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SECOND_COMPAT_ID = 'e15d5979-e823-4ce8-a2ab-513dc358dae1'
const MACCMS_ID = '21999133-1b22-4e15-a48b-a8c6677cd902'

type LegacyRecord = Record<string, unknown> & {
  id: string
  options: Record<string, unknown>
}

interface StoredProviderConfig {
  version: number
  data: ProviderConfig[]
}

function readFixtureRecords(): LegacyRecord[] {
  return readV150Store<LegacyRecord[]>('providerConfig').data
}

function recordById(id: string): LegacyRecord {
  const record = readFixtureRecords().find((r) => r.id === id)
  if (!record) {
    throw new Error(`fixture has no record ${id}`)
  }
  return record
}

async function upgradeFrom(version: number, data: unknown) {
  await fakeBrowser.storage.sync.set({ providerConfig: { version, data } })
  const service = createUpgradeContainer().get(ProviderConfigService)
  await service.options.upgrade({})
  const entry = await fakeBrowser.storage.sync.get('providerConfig')
  return entry.providerConfig as StoredProviderConfig
}

function silenceMigrationLogs() {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
}

describe('providerConfig upgrade from the v1.5.0 fixture', () => {
  let stored: StoredProviderConfig

  beforeEach(async () => {
    silenceMigrationLogs()
    stored = await upgradeFrom(1, readFixtureRecords())
  })

  it('ends at version 6', () => {
    expect(stored.version).toBe(6)
  })

  it('keeps the six records in the order v1.5.0 stored them', () => {
    expect(stored.data).toHaveLength(6)
  })

  it('gives the built-ins the default name and keeps the custom names', () => {
    expect(stored.data.map((c) => [c.id, c.customName])).toEqual([
      [SELF_HOSTED_ID, 'DanDanPlay'],
      ['bilibili', null],
      ['dandanplay', null],
      [MACCMS_ID, 'VOD'],
      ['tencent', null],
      [SECOND_COMPAT_ID, 'Danmu API'],
    ])
  })

  it('strips the builtin: prefix from built-in ids and leaves uuids alone', () => {
    expect(stored.data.map((c) => c.id)).toEqual([
      SELF_HOSTED_ID,
      'bilibili',
      'dandanplay',
      MACCMS_ID,
      'tencent',
      SECOND_COMPAT_ID,
    ])
  })

  it('maps every record to its manifest', () => {
    expect(stored.data.map((c) => c.manifestId)).toEqual([
      'dandanplay',
      'bilibili',
      'dandanplay',
      'legacy:maccms',
      'tencent',
      'dandanplay',
    ])
  })

  it('keeps the enabled flag of every record, including a disabled built-in', () => {
    expect(stored.data.map((c) => [c.id, c.enabled])).toEqual([
      [SELF_HOSTED_ID, true],
      ['bilibili', true],
      ['dandanplay', true],
      [MACCMS_ID, true],
      ['tencent', false],
      [SECOND_COMPAT_ID, true],
    ])
  })

  it('keeps the built-in DanDanPlay chConvert 0 as a number next to the proxy base url', () => {
    const builtIn = stored.data.find((c) => c.id === 'dandanplay')

    expect(builtIn?.configValues).toEqual({
      baseUrl: PROXY_DDP_BASE_URL,
      chConvert: 0,
    })
  })

  it('renames the Bilibili danmakuTypePreference to danmakuFormat', () => {
    const bilibili = stored.data.find((c) => c.id === 'bilibili')

    expect(bilibili?.configValues).toEqual({ danmakuFormat: 'xml' })
  })

  it('gives the disabled Tencent built-in empty config values', () => {
    const tencent = stored.data.find((c) => c.id === 'tencent')

    expect(tencent).toMatchObject({
      customName: null,
      enabled: false,
      configValues: {},
    })
  })

  it('strips the trailing /api from the self-hosted base url and keeps its auth verbatim', () => {
    const selfHosted = stored.data.find((c) => c.id === SELF_HOSTED_ID)

    expect(selfHosted?.configValues.baseUrl).toBe(
      'https://ddp.selfhosted.example'
    )
    expect(selfHosted?.configValues.auth).toEqual(
      recordById(SELF_HOSTED_ID).options.auth
    )
    expect(selfHosted?.configValues.auth).toMatchObject({
      enabled: true,
      headers: [{ key: 'X-AppId' }, { key: 'X-AppSecret' }],
    })
  })

  it('leaves the second compatible server base url and disabled auth unchanged', () => {
    const second = stored.data.find((c) => c.id === SECOND_COMPAT_ID)

    expect(second?.configValues).toEqual({
      baseUrl: 'https://danmu.selfhosted.example',
      auth: { enabled: false, headers: [] },
    })
  })

  it('maps the MacCMS options into config values', () => {
    const maccms = stored.data.find((c) => c.id === MACCMS_ID)

    expect(maccms).toMatchObject({
      customName: 'VOD',
      manifestId: 'legacy:maccms',
    })
    expect(maccms?.configValues).toEqual({
      danmakuBaseUrl: 'https://vod.selfhosted.example/danmaku',
      danmuicuBaseUrl: 'https://vod.selfhosted.example/danmuicu',
      stripColor: false,
    })
  })

  it('leaves no type, impl, isBuiltIn or options key on any record', () => {
    stored.data.forEach((config) => {
      expect(Object.keys(config).sort()).toEqual([
        'configValues',
        'customName',
        'enabled',
        'id',
        'manifestId',
      ])
    })
    const text = JSON.stringify(stored.data)
    for (const legacyKey of ['type', 'impl', 'isBuiltIn', 'options', 'name']) {
      expect(text).not.toContain(`"${legacyKey}"`)
    }
  })

  it('produces exactly the expected list', () => {
    const selfHosted = recordById(SELF_HOSTED_ID)
    const second = recordById(SECOND_COMPAT_ID)
    const maccms = recordById(MACCMS_ID)

    expect(stored.data).toEqual([
      {
        id: SELF_HOSTED_ID,
        manifestId: 'dandanplay',
        customName: selfHosted.name as string,
        enabled: true,
        configValues: {
          baseUrl: 'https://ddp.selfhosted.example',
          auth: selfHosted.options.auth,
        },
      },
      {
        id: 'bilibili',
        manifestId: 'bilibili',
        customName: null,
        enabled: true,
        configValues: { danmakuFormat: 'xml' },
      },
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
      },
      {
        id: MACCMS_ID,
        manifestId: 'legacy:maccms',
        customName: maccms.name as string,
        enabled: true,
        configValues: maccms.options,
      },
      {
        id: 'tencent',
        manifestId: 'tencent',
        customName: null,
        enabled: false,
        configValues: {},
      },
      {
        id: SECOND_COMPAT_ID,
        manifestId: 'dandanplay',
        customName: second.name as string,
        enabled: true,
        configValues: second.options,
      },
    ])
  })
})

describe('providerConfig upgrade edge cases', () => {
  beforeEach(() => {
    silenceMigrationLogs()
  })

  it('drops corrupt non-object entries and keeps the other records without resetting the store', async () => {
    const records = readFixtureRecords()
    const clean = await upgradeFrom(1, records)

    fakeBrowser.reset()
    const stored = await upgradeFrom(1, [
      records[0],
      null,
      'not a record',
      ...records.slice(1, 3),
      42,
      ...records.slice(3),
    ])

    expect(stored.version).toBe(6)
    expect(stored.data).toHaveLength(6)
    expect(stored.data).toEqual(clean.data)
  })

  it('drops a record of an unrecognized type and keeps the other records', async () => {
    const stored = await upgradeFrom(1, [
      ...readFixtureRecords(),
      { id: 'mystery', name: 'Mystery', enabled: true, type: 'Unknown' },
    ])

    expect(stored.data.map((c) => c.id)).toEqual([
      SELF_HOSTED_ID,
      'bilibili',
      'dandanplay',
      MACCMS_ID,
      'tencent',
      SECOND_COMPAT_ID,
    ])
  })

  it('leaves a store that is already at version 6 unchanged, including a trailing /api', async () => {
    const current: ProviderConfig[] = [
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        customName: 'My DanDanPlay',
        enabled: false,
        configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 2 },
      },
      {
        id: 'custom-1',
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: {
          baseUrl: 'https://mine.example/api',
          auth: { enabled: false, headers: [] },
        },
      },
    ]

    const stored = await upgradeFrom(6, current)

    expect(stored).toEqual({ version: 6, data: current })
  })

  it('moves a version 5 store to custom names whatever the built-in was called', async () => {
    const stored = await upgradeFrom(5, [
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        name: '弹弹play',
        enabled: true,
        configValues: { baseUrl: PROXY_DDP_BASE_URL },
      },
      {
        id: 'bilibili',
        manifestId: 'bilibili',
        name: 'Bilibili',
        enabled: true,
        configValues: {},
      },
      {
        id: 'custom-1',
        manifestId: 'dandanplay',
        name: 'DanDanPlay',
        enabled: true,
        configValues: { baseUrl: 'https://mine.example' },
      },
      {
        id: 'legacy:maccms',
        manifestId: 'legacy:maccms',
        name: 'VOD',
        enabled: true,
        configValues: {},
      },
    ])

    expect(stored.version).toBe(6)
    expect(stored.data.map((c) => [c.id, c.customName])).toEqual([
      ['dandanplay', null],
      ['bilibili', null],
      ['custom-1', 'DanDanPlay'],
      ['legacy:maccms', 'VOD'],
    ])
  })

  it('keeps a non-default chConvert the user picked on the built-in DanDanPlay', async () => {
    const builtIn = recordById('builtin:dandanplay')

    const stored = await upgradeFrom(1, [
      { ...builtIn, options: { ...builtIn.options, chConvert: 2 } },
    ])

    const ddp = stored.data.find((c) => c.id === 'dandanplay')
    expect(ddp?.configValues.chConvert).toBe(2)
  })

  it('keeps a danmakuFormat the user picked on the built-in Bilibili', async () => {
    const builtIn = recordById('builtin:bilibili')

    const stored = await upgradeFrom(1, [
      { ...builtIn, options: { danmakuTypePreference: 'protobuf' } },
    ])

    const bilibili = stored.data.find((c) => c.id === 'bilibili')
    expect(bilibili?.configValues.danmakuFormat).toBe('protobuf')
  })

  it('keeps the stored order of a list that holds only the three built-ins', async () => {
    const stored = await upgradeFrom(1, [
      recordById('builtin:tencent'),
      recordById('builtin:dandanplay'),
      recordById('builtin:bilibili'),
    ])

    expect(stored.data.map((c) => c.id)).toEqual([
      'tencent',
      'dandanplay',
      'bilibili',
    ])
  })

  it('folds a custom record whose id is literally dandanplay into the built-in when the built-in comes first', async () => {
    const custom = { ...recordById(SELF_HOSTED_ID), id: 'dandanplay' }

    const stored = await upgradeFrom(1, [
      recordById('builtin:dandanplay'),
      custom,
    ])

    const ddp = stored.data.filter((c) => c.id === 'dandanplay')
    expect(ddp).toHaveLength(1)
    expect(ddp[0].configValues.baseUrl).toBe(PROXY_DDP_BASE_URL)
    expect(ddp[0].configValues.auth).toEqual(
      recordById(SELF_HOSTED_ID).options.auth
    )
  })

  it('keeps a custom record whose id is literally dandanplay when it comes before the built-in', async () => {
    const custom = { ...recordById(SELF_HOSTED_ID), id: 'dandanplay' }

    const stored = await upgradeFrom(1, [
      custom,
      recordById('builtin:dandanplay'),
    ])

    const ddp = stored.data.filter((c) => c.id === 'dandanplay')
    expect(ddp).toHaveLength(1)
    expect(ddp[0].configValues.baseUrl).toBe('https://ddp.selfhosted.example')
    expect(ddp[0].configValues.chConvert).toBe(0)
  })
})
