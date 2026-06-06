import { describe, expect, it } from 'vitest'
import { standaloneManifestSpecs } from './standaloneManifestSpecs'

/**
 * The standalone runtime has no manifest registry, so it resolves the provider
 * config schema from the bundled manifests. Without this the generic provider
 * config form renders name-only in standalone builds. Asserts a known manifest
 * exposes its configSchema.
 */

describe('standaloneManifestSpecs', () => {
  it('exposes the bundled configSchema for a known manifest', () => {
    const spec = standaloneManifestSpecs.get('builtin:dandanplay')
    expect(spec?.name).toBeTruthy()
    expect(Object.keys(spec?.configSchema?.properties ?? {})).toContain(
      'baseUrl'
    )
  })

  it('has no entry for an unknown manifest', () => {
    expect(standaloneManifestSpecs.get('unknown:id')).toBeUndefined()
  })
})
