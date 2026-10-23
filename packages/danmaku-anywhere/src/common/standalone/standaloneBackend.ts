import { uiContainer } from '@/common/ioc/uiIoc'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import {
  ConfigSchemaSourceSymbol,
  type IConfigSchemaSource,
  type IProviderConfigCleanup,
  type ManifestAvailability,
  ProviderConfigCleanupSymbol,
} from '@/common/options/providerConfig/ports'
import { bundledConfigSchema } from './bundledManifests'
import {
  lockedProviderConfigWriter,
  type ProviderConfigWrites,
} from './lockedProviderConfigWriter'

export { bundledManifestNames, bundledManifestSpec } from './bundledManifests'

// The standalone page's stand-in for the background, loaded on its first
// call. It has no bookmarks to clean up and only the bundled manifests to
// check configs against.
const configSchemaSource: IConfigSchemaSource = {
  find: async (manifestId: string): Promise<ManifestAvailability> => {
    const bundled = bundledConfigSchema(manifestId)
    if (bundled === undefined) {
      return { status: 'unavailable', reason: 'not-registered' }
    }
    return { status: 'ok', configSchema: bundled.configSchema, fallback: false }
  },
}

const cleanup: IProviderConfigCleanup = {
  beforeDelete: () => Promise.resolve(),
}

uiContainer.bind(ConfigSchemaSourceSymbol).toConstantValue(configSchemaSource)
uiContainer.bind(ProviderConfigCleanupSymbol).toConstantValue(cleanup)

export function providerConfigWriter(): ProviderConfigWrites {
  return lockedProviderConfigWriter(
    uiContainer.get(ProviderConfigWriter),
    (name, run) => navigator.locks.request(name, () => run())
  )
}
