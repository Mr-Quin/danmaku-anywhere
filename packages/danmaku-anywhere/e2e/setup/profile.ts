// TestProfile: declarative spec setup. A spec describes the world it wants
// (which providers enabled, what extension options, what raw storage seeds,
// what network mocks) and applyProfile() applies it via the dev API and
// Playwright's context.route.
//
// Adding a knob = add an optional field here, handle it in applyProfile.

import {
  type BilibiliProviderOptions,
  DanDanChConvert,
  type DanDanDanPlayProviderOptions,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext, Route } from '@playwright/test'
import type { ExtensionOptions } from '../../src/common/options/extensionOptions/schema'
import type { ProviderConfig } from '../../src/common/options/providerConfig/schema'
import type { DaClient } from './da-client'

export type StorageArea = 'sync' | 'local' | 'session'

export interface BuiltInProvidersProfile {
  bilibili?: { enabled?: boolean; options?: Partial<BilibiliProviderOptions> }
  dandanplay?: {
    enabled?: boolean
    options?: Partial<DanDanDanPlayProviderOptions>
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
  // Built-in provider toggles + per-provider options. Anything not specified
  // remains DISABLED — test isolation by default. Override at the spec level.
  providers?: BuiltInProvidersProfile
  // Custom providers (DanDanPlayCompatible, MacCMS) appended to the config.
  customProviders?: ProviderConfig[]
  // Partial extension options to merge over the current state.
  extensionOptions?: Partial<ExtensionOptions>
  // Raw storage seeds — escape hatch for migration tests.
  // Applied BEFORE provider/extensionOptions writes. Pre-migration shapes go
  // here; the migration is then triggered with `runUpgrade: true`.
  rawStorage?: RawStorageSeed[]
  // After applying rawStorage, optionally call da.runtime.runUpgrade() to
  // exercise migration paths (used by upgrade-install.spec.ts).
  runUpgrade?: boolean
  // Playwright network mocks installed via context.route.
  network?: NetworkMock[]
}

// Built-in provider IDs are stable string literals declared in
// PROVIDER_TO_BUILTIN_ID. Keeping them inlined here avoids importing the
// canonical map (which pulls in danmaku-converter just to look up 3 strings).
const BUILTIN_IDS = {
  dandanplay: 'builtin:dandanplay',
  bilibili: 'builtin:bilibili',
  tencent: 'builtin:tencent',
} as const

function buildBuiltInProviderConfigs(
  profile: BuiltInProvidersProfile = {}
): ProviderConfig[] {
  const dandanplay = profile.dandanplay ?? {}
  const bilibili = profile.bilibili ?? {}
  const tencent = profile.tencent ?? {}

  return [
    {
      id: BUILTIN_IDS.dandanplay,
      type: 'DanDanPlay',
      name: 'DanDanPlay',
      impl: DanmakuSourceType.DanDanPlay,
      enabled: dandanplay.enabled ?? false,
      isBuiltIn: true,
      options: {
        chConvert: DanDanChConvert.None,
        ...dandanplay.options,
      },
    },
    {
      id: BUILTIN_IDS.bilibili,
      type: 'Bilibili',
      name: 'Bilibili',
      impl: DanmakuSourceType.Bilibili,
      enabled: bilibili.enabled ?? false,
      isBuiltIn: true,
      options: {
        danmakuTypePreference: 'xml',
        ...bilibili.options,
      },
    },
    {
      id: BUILTIN_IDS.tencent,
      type: 'Tencent',
      name: 'Tencent',
      impl: DanmakuSourceType.Tencent,
      enabled: tencent.enabled ?? false,
      isBuiltIn: true,
      options: {},
    },
  ]
}

export async function applyProfile(
  context: BrowserContext,
  da: DaClient,
  profile: TestProfile
): Promise<void> {
  // Always start from a clean storage slate so spec ordering can't leak
  // state across tests. Each Playwright test gets a fresh persistent
  // context, but a future change (test parallelism inside one context,
  // serial specs that share one context) shouldn't introduce subtle bugs.
  //
  // Order: clear → seed (migration shapes) → optional upgrade → typed
  // overrides → network mocks. Typed writes go AFTER the upgrade so the
  // migration result isn't clobbered. If a profile sets BOTH rawStorage +
  // runUpgrade + providers, the typed providerConfig.set wins on purpose
  // (specs that need the migrated state should not also set providers).
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
