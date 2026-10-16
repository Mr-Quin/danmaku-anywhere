import type { ConfigSchema } from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import type { IConfigSchemaSource } from '@/common/options/providerConfig/ports'
import { ManifestRegistry } from './ManifestRegistry'

@injectable('Singleton')
export class ManifestConfigSchemaSource implements IConfigSchemaSource {
  constructor(
    @inject(ManifestRegistry)
    private readonly manifestRegistry: ManifestRegistry
  ) {}

  async find(
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined> {
    const lookup = await this.manifestRegistry.lookup(manifestId)
    if (lookup.status !== 'ok') {
      return undefined
    }
    return { configSchema: lookup.runner.manifest.configSchema }
  }
}
