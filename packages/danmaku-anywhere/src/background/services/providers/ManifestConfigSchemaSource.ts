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
    await this.manifestRegistry.ready
    const known = this.manifestRegistry
      .listManifests()
      .some((manifest) => manifest.id === manifestId)
    if (!known) {
      return undefined
    }
    const { manifest } = this.manifestRegistry.getRunner(manifestId)
    return { configSchema: manifest.configSchema }
  }
}
