import type {
  Integration,
  IntegrationPolicy,
} from '@/common/options/integrationPolicyStore/schema'
import { getRandomUUID } from '@/common/utils/utils'

const plexPolicy = {
  name: 'Plex',
  policy: {
    episode: {
      regex: [
        {
          value: '\\d+',
          quick: false,
        },
      ],
      selector: [
        {
          value:
            '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/a[2]',
          quick: false,
        },
        {
          value:
            '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/span[3]',
          quick: false,
        },
      ],
    },
    episodeTitle: {
      regex: [
        {
          value: '.+',
          quick: false,
        },
      ],
      selector: [
        {
          value:
            '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/a[1]',
          quick: false,
        },
      ],
    },
    options: {
      dandanplay: {
        useMatchApi: false,
      },
      useAI: false,
      titleOnly: false,
    },
    season: {
      regex: [
        {
          value: '.+',
          quick: false,
        },
      ],
      selector: [
        {
          value:
            '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/a[1]',
          quick: false,
        },
        {
          value:
            '//*[@id="plex"]//span[contains(@class, "MetadataPosterTitle-singleLineTitle")]/span[1]/span[1]',
          quick: false,
        },
      ],
    },
    title: {
      regex: [
        {
          value: '.+',
          quick: false,
        },
      ],
      selector: [
        {
          value:
            '//*[@id="plex"]//a[contains(@class, "MetadataPosterTitle-singleLineTitle")]',
          quick: false,
        },
      ],
    },
  } satisfies IntegrationPolicy,
}

export const defaultXPathPolicies: Integration[] = [
  {
    ...plexPolicy,
    id: getRandomUUID(),
  },
]

export const getDefaultXPathPolicy = (name: string) => {
  return defaultXPathPolicies.find((policy) => policy.name === name)
}
