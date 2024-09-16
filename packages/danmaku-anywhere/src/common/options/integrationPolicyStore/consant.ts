import type {
  IntegrationPolicy,
  IntegrationPolicyItem,
} from '@/common/options/integrationPolicyStore/schema'
import { getRandomUUID } from '@/common/utils/utils'

const plexPolicy = {
  name: 'Plex',
  policy: {
    episodeNumber: {
      regex: ['\\d+'],
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div[2]/span/span[1]/a[2]',
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[3]',
      ],
    },
    episodeTitle: {
      regex: ['.+'],
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/a',
      ],
    },
    seasonNumber: {
      regex: ['\\d+'],
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div[2]/span/span[1]/a[1]',
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[1]',
      ],
    },
    title: {
      regex: ['.+'],
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/a',
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

export const createXPathPolicy = (): IntegrationPolicy => {
  return {
    title: {
      selector: [''],
      regex: ['.+'],
    },
    episodeNumber: {
      selector: [''],
      regex: ['\\d+'],
    },
    seasonNumber: {
      selector: [''],
      regex: ['\\d+'],
    },
    episodeTitle: {
      selector: [''],
      regex: ['.+'],
    },
    titleOnly: true,
  }
}
