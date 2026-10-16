import { inject, injectable } from 'inversify'
import type { SourceRef } from '@/common/errors/AppError'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  sourceDisplayNames,
  sourceName,
} from '@/common/options/providerConfig/sourceName'
import { toSourceRef } from '@/common/options/providerConfig/utils'
import { ManifestRegistry } from './ManifestRegistry'

export type SourceRefOf = (config: ProviderConfig) => SourceRef

// Errors carry the name the UI shows for a source: its custom name, or its
// manifest's name as the registry names it.
@injectable('Singleton')
export class SourceNames {
  constructor(
    @inject(ManifestRegistry)
    private readonly manifestRegistry: ManifestRegistry,
    @inject(ProviderConfigService)
    private readonly providerConfigService: ProviderConfigService
  ) {}

  async refs(): Promise<SourceRefOf> {
    const manifestNames = await this.manifestRegistry.displayNames()
    const configs = await this.providerConfigService.getAll()
    const displayNames = sourceDisplayNames(configs, manifestNames)
    return (config) => {
      return toSourceRef(
        config,
        displayNames.get(config.id) ?? sourceName(config, manifestNames)
      )
    }
  }

  async refOf(config: ProviderConfig): Promise<SourceRef> {
    const refOf = await this.refs()
    return refOf(config)
  }
}
