import { inject, injectable } from 'inversify'
import type { z } from 'zod'
import {
  decodeShareConfig,
  encodeShareConfig,
} from '@/common/options/combinedPolicy/shareSchema'
import {
  createIntegrationInput,
  zIntegration,
} from '@/common/options/integrationPolicyStore/schema'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import { mountConfigInputSchema } from '@/common/options/mountConfig/schema'
import { MountConfigService } from '@/common/options/mountConfig/service'

export const zCombinedPolicy = mountConfigInputSchema.extend({
  integration: zIntegration.optional(),
})

export type CombinedPolicy = z.output<typeof zCombinedPolicy>

@injectable('Singleton')
export class CombinedPolicyService {
  constructor(
    @inject(MountConfigService) private configService: MountConfigService,
    @inject(IntegrationPolicyService)
    private integrationService: IntegrationPolicyService
  ) {}

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

  async exportShareCode(id: string): Promise<string> {
    const config = await this.configService.get(id)

    if (!config) {
      throw new Error(`Config not found: "${id}"`)
    }

    if (!config.integration) {
      throw new Error(`Config "${config.name}" does not have an integration`)
    }

    const integration = await this.integrationService.get(config.integration)

    if (!integration) {
      throw new Error(`Integration not found: "${config.integration}"`)
    }

    const { options: _, ...policy } = integration.policy

    return encodeShareConfig({
      patterns: config.patterns,
      policy: policy,
    })
  }

  async importShareCode(code: string): Promise<string> {
    const sharedConfig = await decodeShareConfig(code)

    const dateStr = new Date().toLocaleDateString()
    const name = `Imported Config ${dateStr}`

    const integrationInput = createIntegrationInput(
      sharedConfig.patterns[0] ?? name
    )

    integrationInput.policy = {
      ...integrationInput.policy,
      ...sharedConfig.policy,
    }

    const integration = await this.integrationService.import(
      zIntegration.parse(integrationInput)
    )

    const mountConfigInput = createMountConfig({
      name,
      patterns: sharedConfig.patterns,
      mode: 'xpath',
      integration: integration.id,
      enabled: true,
    })

    const config = await this.configService.create(mountConfigInput)
    return config.id
  }
}
