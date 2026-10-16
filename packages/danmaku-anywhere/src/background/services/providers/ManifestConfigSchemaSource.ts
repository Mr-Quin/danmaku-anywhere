import { inject, injectable } from 'inversify'
import type {
  IConfigSchemaSource,
  ManifestAvailability,
} from '@/common/options/providerConfig/ports'
import { ManifestRegistry } from './ManifestRegistry'

@injectable('Singleton')
export class ManifestConfigSchemaSource implements IConfigSchemaSource {
  constructor(
    @inject(ManifestRegistry)
    private readonly manifestRegistry: ManifestRegistry
  ) {}

  async find(manifestId: string): Promise<ManifestAvailability> {
    const lookup = await this.manifestRegistry.lookup(manifestId)
    if (lookup.status === 'ok') {
      return {
        status: 'ok',
        configSchema: lookup.runner.manifest.configSchema,
        fallback: lookup.fallback,
      }
    }
    return lookup
  }
}
