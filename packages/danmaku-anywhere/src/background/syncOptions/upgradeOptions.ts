import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { xPathPolicyStore } from '@/common/options/integrationPolicyStore/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { upgradeService } from '@/common/options/UpgradeService/UpgradeService'

export const upgradeOptions = async () => {
  // Ensure all services are initialized/registered
  // (They are imported, so their constructors run and register with upgradeService)
  // We just need to reference them to prevent tree-shaking (though side-effects imports might be enough)
  const _ = [
    danmakuOptionsService,
    extensionOptionsService,
    xPathPolicyStore,
    mountConfigService,
    providerConfigService,
  ]

  await upgradeService.upgrade()
}
