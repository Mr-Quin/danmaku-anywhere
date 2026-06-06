import { describe, expect, it } from 'vitest'
import { standaloneBackgroundHandlers } from './standaloneHandlers'

/**
 * The standalone runtime has no manifest registry, so providerGetManifestSpec
 * resolves the config schema straight from the bundled manifests. Without this
 * the generic provider config form renders name-only in standalone builds.
 * Asserts a known manifest yields its configSchema and unknown ids fall back.
 */

const getSpec = standaloneBackgroundHandlers.providerGetManifestSpec

describe('standalone providerGetManifestSpec', () => {
  it('resolves the bundled configSchema for a known manifest', () => {
    expect(getSpec).toBeDefined()
    const spec = getSpec?.({ manifestId: 'builtin:dandanplay' })
    expect(spec?.name).toBeTruthy()
    expect(Object.keys(spec?.configSchema?.properties ?? {})).toContain(
      'baseUrl'
    )
  })

  it('falls back to an empty spec for an unknown manifest', () => {
    const spec = getSpec?.({ manifestId: 'unknown:id' })
    expect(spec).toEqual({ name: '', hasLoginProbe: false })
  })
})
