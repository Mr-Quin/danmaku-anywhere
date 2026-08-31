import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { versionSubtitle } from './InstalledList'

/**
 * versionSubtitle falls back to a config's own base URL when its manifest
 * hasn't resolved yet. During an offline bundle seed every installed config
 * reaches that fallback branch, not just legacy MacCMS, so it must not
 * assume configValues is populated.
 */

const manifest: ProviderManifestInfo = {
  id: 'dandanplay',
  name: 'DanDanPlay',
  version: '0.5.0',
  identityFields: [],
  kind: 'preinstalled',
}

function cfg(
  configValues: Record<string, unknown> | undefined
): ProviderConfig {
  return {
    id: 'a',
    manifestId: 'legacy:maccms',
    name: 'VOD',
    enabled: true,
    // The runtime value can violate the type during the seeding race the
    // guard defends against, so the cast mirrors what actually reaches it.
    configValues: configValues as ProviderConfig['configValues'],
  }
}

describe('versionSubtitle', () => {
  it('shows the manifest version when the manifest is resolved', () => {
    expect(versionSubtitle(cfg({}), manifest)).toBe('v0.5.0')
  })

  it('falls back to configValues.danmakuBaseUrl when there is no manifest', () => {
    expect(
      versionSubtitle(cfg({ danmakuBaseUrl: 'https://vod.example/danmaku' }))
    ).toBe('https://vod.example/danmaku')
  })

  it('returns an empty string rather than throwing when configValues is undefined', () => {
    expect(versionSubtitle(cfg(undefined))).toBe('')
  })
})
