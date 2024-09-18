import type {
  IntegrationPolicy,
  IntegrationPolicyItem,
} from '@/common/options/integrationPolicyStore/schema'
import { getRandomUUID } from '@/common/utils/utils'

const plexPolicy = {
  name: 'Plex',
  policy: {
    episode: {
      regex: ['\\d+'],
      selector: [
        '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/a[2]',
        '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/span[3]',
      ],
    },
    episodeTitle: {
      regex: ['.+'],
      selector: [
        '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/a[1]',
      ],
    },
    season: {
      regex: ['.+'],
      selector: [
        '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/a[1]',
        '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/span[1]',
      ],
    },
    title: {
      regex: ['.+'],
      selector: [
        '//*[@id="plex"]//a[contains(@class, "MetadataPosterTitle-singleLineTitle")]',
      ],
    },
    titleOnly: false,
  } satisfies IntegrationPolicy,
}

export const defaultXPathPolicies: IntegrationPolicyItem[] = [
  {
    ...plexPolicy,
    id: getRandomUUID(),
  },
]

export const getDefaultXPathPolicy = (name: string) => {
  return defaultXPathPolicies.find((policy) => policy.name === name)
}
