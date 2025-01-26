import { defaultXPathPolicies } from '@/common/options/integrationPolicyStore/constant'
import type {
  Integration,
  IntegrationV1,
} from '@/common/options/integrationPolicyStore/schema'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

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
        } satisfies Integration
      })
    },
  })
