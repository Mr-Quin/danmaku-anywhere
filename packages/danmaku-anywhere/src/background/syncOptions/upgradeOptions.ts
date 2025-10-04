import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { xPathPolicyStore } from '@/common/options/integrationPolicyStore/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { providerConfigService } from '@/common/options/providerConfig/service'

export const upgradeOptions = async () => {
  await Promise.all([
    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.options.upgrade(),
    xPathPolicyStore.upgrade(),
    providerConfigService.options.upgrade(),
  ])
}
