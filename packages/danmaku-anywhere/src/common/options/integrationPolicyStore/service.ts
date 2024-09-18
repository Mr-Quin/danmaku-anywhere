import { defaultXPathPolicies } from '@/common/options/integrationPolicyStore/constant'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const xPathPolicyStore = new OptionsService(
  'xpathPolicy',
  defaultXPathPolicies,
  'local'
).version(1, {
  upgrade: (data: any) => data,
})
