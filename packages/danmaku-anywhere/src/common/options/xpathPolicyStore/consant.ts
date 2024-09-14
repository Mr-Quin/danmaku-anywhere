import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import { xpathPolicyItemSchema } from '@/common/options/xpathPolicyStore/schema'

const plexPolicy = {
  name: 'Plex',
  policy: {
    title: ['//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/a'],
    titleRegex: '.+',
    episode: [
      '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[3]',
    ],
    episodeRegex: '\\d+',
    season: [
      '//*[@id="plex"]/div[4]/div/div[*]/div/div/div[2]/div[1]/div/span/span[1]/span[1]',
    ],
    seasonRegex: '\\d+',
  },
}

export const defaultXPathPolicies: XPathPolicyItem[] = [
  xpathPolicyItemSchema.parse(plexPolicy),
]

export const getDefaultXPathPolicy = (name: string) => {
  return defaultXPathPolicies.find((policy) => policy.name === name)
}
