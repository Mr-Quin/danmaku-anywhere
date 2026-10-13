import type { ConfigSchema } from '@mr-quin/dango'
import { injectable } from 'inversify'
import type { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import type { IConfigSchemaSource } from '@/common/options/providerConfig/ports'

// What the standalone page's in-page background needs from the UI container.
// The container installs it once it is built, since the RPC client that uses
// it loads first.
export interface StandaloneBackend {
  providerConfigWriter(): ProviderConfigWriter
}

let installed: StandaloneBackend | undefined

export function installStandaloneBackend(backend: StandaloneBackend): void {
  installed = backend
}

export function standaloneBackend(): StandaloneBackend {
  if (!installed) {
    throw new Error('The standalone backend is not installed')
  }
  return installed
}

// The bundled manifests load on first use, so extension builds, which never
// take this path, do not carry them in every page.
export async function bundledManifestNames(
  locale?: string
): Promise<Record<string, string>> {
  const bundled = await import('./bundledManifests')
  return bundled.bundledManifestNames(locale)
}

@injectable('Singleton')
export class BundledConfigSchemaSource implements IConfigSchemaSource {
  async find(
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined> {
    const bundled = await import('./bundledManifests')
    return bundled.bundledConfigSchema(manifestId)
  }
}
