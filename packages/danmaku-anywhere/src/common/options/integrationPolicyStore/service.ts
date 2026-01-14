import {
  type Integration,
  type IntegrationV1,
  type IntegrationV2,
  type IntegrationV3,
  migrateV1ToV2,
  migrateV2ToV3,
} from '@danmaku-anywhere/integration-policy'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'

@injectable('Singleton')
export class IntegrationPolicyService implements IStoreService {
  public readonly name = 'integrationPolicy'
  public readonly options: OptionsService<Integration[]>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<Integration[]>(
      'xpathPolicy',
      [],
      this.logger,
      'local'
    )
      .version(1, {
        upgrade: (data) => data,
      })
      .version(2, {
        upgrade: (data: IntegrationV1[]): IntegrationV2[] => {
          return migrateV1ToV2(data)
        },
      })
      .version(3, {
        upgrade: (data: IntegrationV2[]): IntegrationV2[] => {
          return data.map((policy) => {
            return {
              ...policy,
              policy: {
                ...policy.policy,
                options: {
                  ...policy.policy.options,
                  // add useAi field
                  useAI: false,
                },
              },
            } satisfies IntegrationV2
          })
        },
      })
      .version(4, {
        upgrade: (data: IntegrationV2[]): IntegrationV3[] => {
          return migrateV2ToV3(data)
        },
      })
  }

  async get(id: string): Promise<Integration | undefined> {
    const configs = await this.options.get()

    return configs.find((item) => item.id === id)
  }

  async getAll(): Promise<Integration[]> {
    return this.options.get()
  }

  async import(policy: Integration) {
    const configs = await this.options.get()

    const existing = configs.find((item) => {
      return item.id === policy.id
    })

    // if the policy already exists, update it
    if (existing) {
      await this.options.set([
        ...configs.filter((item) => item.id !== existing.id),
        policy,
      ])
      return existing
    }

    await this.options.set([...configs, policy])
    return policy
  }
}
