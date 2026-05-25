import {
  DanDanChConvert,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext, Route } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { StorageArea } from '../../src/devApi/namespaces/StorageNamespace'
import type { DaClient } from './da-client'

export interface BuiltInProvidersProfile {
  bilibili?: {
    enabled?: boolean
    options?: { danmakuFormat?: 'xml' | 'protobuf' }
  }
  dandanplay?: {
    enabled?: boolean
    options?: { chConvert?: DanDanChConvert }
  }
  tencent?: { enabled?: boolean }
}

export interface RawStorageSeed {
  area: StorageArea
  key: string
  value: unknown
}

export interface NetworkMock {
  pattern: string | RegExp
  respond: (route: Route) => Promise<void> | void
}

export interface TestProfile {
  // Built-ins not listed default to disabled.
  providers?: BuiltInProvidersProfile
  customProviders?: ProviderConfig[]
  extensionOptions?: Partial<ExtensionOptions>
  // Raw chrome.storage seeds applied before typed writes.
  rawStorage?: RawStorageSeed[]
  // If true, runs storage migrations after rawStorage is applied.
  runUpgrade?: boolean
  network?: NetworkMock[]
}

function buildBuiltInProviderConfigs(
  profile: BuiltInProvidersProfile = {}
): ProviderConfig[] {
  const dandanplay = profile.dandanplay ?? {}
  const bilibili = profile.bilibili ?? {}
  const tencent = profile.tencent ?? {}

  return [
    {
      id: 'builtin:dandanplay',
      manifestId: 'builtin:dandanplay',
      name: 'DanDanPlay',
      impl: DanmakuSourceType.DanDanPlay,
      enabled: dandanplay.enabled ?? false,
      isBuiltIn: true,
      configValues: {
        chConvert: DanDanChConvert.None,
        ...dandanplay.options,
      },
    },
    {
      id: 'builtin:bilibili',
      manifestId: 'builtin:bilibili',
      name: 'Bilibili',
      impl: DanmakuSourceType.Bilibili,
      enabled: bilibili.enabled ?? false,
      isBuiltIn: true,
      configValues: {
        danmakuFormat: 'xml',
        ...bilibili.options,
      },
    },
    {
      id: 'builtin:tencent',
      manifestId: 'builtin:tencent',
      name: 'Tencent',
      impl: DanmakuSourceType.Tencent,
      enabled: tencent.enabled ?? false,
      isBuiltIn: true,
      configValues: {},
    },
  ]
}

export async function applyProfile(
  context: BrowserContext,
  da: DaClient,
  profile: TestProfile
): Promise<void> {
  await da.storage.clear()

  for (const seed of profile.rawStorage ?? []) {
    await da.storage.setRaw(seed.area, seed.key, seed.value)
  }

  if (profile.runUpgrade) {
    await da.runtime.runUpgrade()
  }

  if (
    profile.providers ||
    (profile.customProviders && profile.customProviders.length > 0)
  ) {
    const builtIns = buildBuiltInProviderConfigs(profile.providers)
    const customs = profile.customProviders ?? []
    await da.providerConfig.set([...builtIns, ...customs])
  }

  if (profile.extensionOptions) {
    await da.extensionOptions.update(profile.extensionOptions)
  }

  for (const m of profile.network ?? []) {
    await context.route(m.pattern, m.respond)
  }
}
