import type { IStoreService } from '@/common/options/IStoreService'
import type {
  Integration,
  IntegrationV1,
  IntegrationV2,
} from '@/common/options/integrationPolicyStore/schema'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const xPathPolicyStore = new OptionsService<Integration[]>(
  'xpathPolicy',
  [],
  'local'
)
  .version(1, {
    upgrade: (data) => data,
  })
  .version(2, {
    upgrade: (data) => {
      const mapValue = (value: string) => {
        return { value, quick: false }
      }

      return (data as IntegrationV1[]).map((policy) => {
        return {
          name: policy.name,
          id: policy.id,
          policy: {
            title: {
              selector: policy.policy.title.selector.map(mapValue),
              regex: policy.policy.title.regex.map(mapValue),
            },
            episode: {
              selector: policy.policy.episode.selector.map(mapValue),
              regex: policy.policy.episode.regex.map(mapValue),
            },
            season: {
              selector: policy.policy.season.selector.map(mapValue),
              regex: policy.policy.season.regex.map(mapValue),
            },
            episodeTitle: {
              selector: policy.policy.episodeTitle.selector.map(mapValue),
              regex: policy.policy.episodeTitle.regex.map(mapValue),
            },
            options: {
              titleOnly: policy.policy.titleOnly,
              dandanplay: {
                useMatchApi: false,
              },
            },
          },
        } satisfies IntegrationV2
      })
    },
  })
  .version(3, {
    upgrade: (data) => {
      return (data as IntegrationV2[]).map((policy) => {
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
        } satisfies Integration
      })
    },
  })

class IntegrationPolicyService implements IStoreService {
  public readonly options = xPathPolicyStore

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

export const integrationPolicyService = new IntegrationPolicyService()
