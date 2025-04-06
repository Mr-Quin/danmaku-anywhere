import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultXPathPolicies } from '@/common/options/integrationPolicyStore/constant'
import type {
  Integration,
  IntegrationV1,
  IntegrationV2,
} from '@/common/options/integrationPolicyStore/schema'

export const xPathPolicyStore = new OptionsService(
  'xpathPolicy',
  defaultXPathPolicies,
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
