import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { xPathPolicyStore } from '@/common/options/integrationPolicyStore/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { providerConfigService } from '@/common/options/providerConfig/service'

export const upgradeOptions = async () => {
  await Promise.all([
    /**
     * The provider config service needs to be the first one to initialize for the migration of
     * extension options v20 to v21. This migration sets data in the provider config service,
     * which will fail if the provider config service is not initialized.
     */
    providerConfigService.options.upgrade(),

    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.options.upgrade(),
    xPathPolicyStore.upgrade(),
  ])
}
