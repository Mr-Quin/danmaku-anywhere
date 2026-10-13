import type { ConfigSchema } from '@mr-quin/dango'
import { uiContainer } from '@/common/ioc/uiIoc'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import {
  ConfigSchemaSourceSymbol,
  type IConfigSchemaSource,
  type IProviderConfigCleanup,
  ProviderConfigCleanupSymbol,
} from '@/common/options/providerConfig/ports'
import { bundledConfigSchema } from './bundledManifests'

export { bundledManifestNames, bundledManifestSpec } from './bundledManifests'

// The standalone page's stand-in for the background, loaded on its first
// call. It has no bookmarks to clean up and only the bundled manifests to
// check configs against.
const configSchemaSource: IConfigSchemaSource = {
  find: async (
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined> => {
    return bundledConfigSchema(manifestId)
  },
}

const cleanup: IProviderConfigCleanup = {
  beforeDelete: () => Promise.resolve(),
}

uiContainer.bind(ConfigSchemaSourceSymbol).toConstantValue(configSchemaSource)
uiContainer.bind(ProviderConfigCleanupSymbol).toConstantValue(cleanup)

export function providerConfigWriter(): ProviderConfigWriter {
  return uiContainer.get(ProviderConfigWriter)
}
