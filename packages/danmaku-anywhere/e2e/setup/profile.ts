import { DanDanChConvert } from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext, Route } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { StorageArea } from '../../src/devApi/namespaces/StorageNamespace'
import type { DaClient } from './da-client'

// The built-in DDP provider points baseUrl at the proxy's /ddp mount. The
// network mock matches on the /ddp/api/v2 path, so the host is arbitrary here.
const PROXY_DDP_BASE_URL = 'https://proxy.test.invalid/ddp'

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
  network?: NetworkMock[]
}

// The extension seeds its preloaded providers on first boot, after the catalog
// loads, and marks itself seeded as the last step. Wait for that before
// rebuilding storage so the seed write can't land on top of the profile's
// configs. The flag is a definitive completion signal, so wait reliably (the
// ceiling only guards against a genuinely stuck seed under heavy parallel load).
async function waitForSeeded(da: DaClient): Promise<void> {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (await da.providerConfig.hasSeeded()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('applyProfile: timed out waiting for the first-boot seed')
}

function buildBuiltInProviderConfigs(
  profile: BuiltInProvidersProfile = {}
): ProviderConfig[] {
  const dandanplay = profile.dandanplay ?? {}
  const bilibili = profile.bilibili ?? {}
  const tencent = profile.tencent ?? {}

  return [
    {
      id: 'dandanplay',
      manifestId: 'dandanplay',
      name: 'DanDanPlay',
      enabled: dandanplay.enabled ?? false,
      configValues: {
        baseUrl: PROXY_DDP_BASE_URL,
        chConvert: DanDanChConvert.None,
        ...dandanplay.options,
      },
    },
    {
      id: 'bilibili',
      manifestId: 'bilibili',
      name: 'Bilibili',
      enabled: bilibili.enabled ?? false,
      configValues: {
        danmakuFormat: 'xml',
        ...bilibili.options,
      },
    },
    {
      id: 'tencent',
      manifestId: 'tencent',
      name: 'Tencent',
      enabled: tencent.enabled ?? false,
      configValues: {},
    },
  ]
}

export async function applyProfile(
  context: BrowserContext,
  da: DaClient,
  profile: TestProfile
): Promise<void> {
  await waitForSeeded(da)
  await da.storage.clear()

  // clear() wiped the options stores; rerun the upgrade so the typed writes
  // below have versioned options to read. Raw seeds are applied afterwards so
  // they stay authoritative rather than being re-migrated.
  await da.runtime.runUpgrade()

  for (const seed of profile.rawStorage ?? []) {
    await da.storage.setRaw(seed.area, seed.key, seed.value)
  }

  if (
    profile.providers ||
    (profile.customProviders && profile.customProviders.length > 0)
  ) {
    const builtIns = buildBuiltInProviderConfigs(profile.providers)
    const customs = profile.customProviders ?? []
    await da.providerConfig.set([...builtIns, ...customs])
  }

  // The profile is the source of truth, so mark seeding done; a catalog refresh
  // during the test must not re-seed over it.
  await da.providerConfig.markSeeded()

  if (profile.extensionOptions) {
    await da.extensionOptions.update(profile.extensionOptions)
  }

  for (const m of profile.network ?? []) {
    await context.route(m.pattern, m.respond)
  }
}
