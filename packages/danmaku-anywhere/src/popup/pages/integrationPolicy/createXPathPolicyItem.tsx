import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'

export type IntegrationPolicyItemWithoutId = Omit<
  IntegrationPolicyItem,
  'id'
> & { id?: string }

export const createXPathPolicyItem = (
  policy?: IntegrationPolicyItem
): IntegrationPolicyItemWithoutId => {
  if (policy) return policy

  return {
    name: '',
    policy: {
      title: {
        selector: [''],
        regex: [''],
      },
      episode: {
        selector: [''],
        regex: [''],
      },
      season: {
        selector: [''],
        regex: [''],
      },
      episodeTitle: {
        selector: [''],
        regex: [''],
      },
      titleOnly: true,
    },
  }
}
