import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultXPathPolicies } from '@/common/options/xpathPolicyStore/consant'

export const xPathPolicyStore = new OptionsService(
  'xpathPolicy',
  defaultXPathPolicies,
  'local'
).version(1, {
  upgrade: (data: any) => data,
})
