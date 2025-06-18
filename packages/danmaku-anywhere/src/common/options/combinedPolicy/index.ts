import type { z } from 'zod'
import { zIntegration } from '@/common/options/integrationPolicyStore/schema'
import { integrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { mountConfigInputSchema } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'

export const zCombinedPolicy = mountConfigInputSchema.extend({
  integration: zIntegration.optional(),
})

export type CombinedPolicy = z.output<typeof zCombinedPolicy>

class CombinedPolicyService {
  public readonly configService = mountConfigService
  public readonly integrationService = integrationPolicyService

  async export(id: string): Promise<CombinedPolicy> {
    const config = await this.configService.get(id)

    if (!config) throw new Error(`Config not found: "${id}"`)

    const integration = config.integration
      ? await this.integrationService.get(config.integration)
      : undefined

    return {
      ...config,
      integration,
    }
  }

  async exportAll(): Promise<CombinedPolicy[]> {
    const configs = await this.configService.getAll()
    const integrations = await this.integrationService.getAll()

    return configs.map((config) => {
      const integration = integrations.find(
        (item) => item.id === config.integration
      )
      return {
        ...config,
        integration,
      }
    })
  }

  async import(config: unknown): Promise<string | undefined> {
    const parseResult = await zCombinedPolicy.safeParseAsync(config)

    if (!parseResult.success) return

    const combinedConfig = parseResult.data
    const integration = combinedConfig.integration

    const importedIntegration = integration
      ? await this.integrationService.import(integration)
      : undefined

    console.log(combinedConfig)

    const imported = await this.configService.import({
      ...combinedConfig,
      integration: importedIntegration?.id,
    })

    return imported.id
  }
}

export const combinedPolicyService = new CombinedPolicyService()
