import type {
  XPathPolicy,
  XPathPolicyItem,
} from '@/common/options/xpathPolicyStore/schema'
import { getRandomUUID } from '@/common/utils/utils'

const plexPolicy = {
  name: 'Plex',
  policy: {
    title: {
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/a',
      ],
      regex: ['.+'],
    },
    episodeNumber: {
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[3]',
      ],
      regex: ['\\d+'],
    },
    seasonNumber: {
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[1]',
      ],
      regex: ['\\d+'],
    },
    episodeTitle: {
      selector: [
        '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/a',
      ],
      regex: ['.+'],
    },
  } satisfies XPathPolicy,
}

export const defaultXPathPolicies: XPathPolicyItem[] = [
  {
    ...plexPolicy,
    id: getRandomUUID(),
  },
]

export const getDefaultXPathPolicy = (name: string) => {
  return defaultXPathPolicies.find((policy) => policy.name === name)
}
