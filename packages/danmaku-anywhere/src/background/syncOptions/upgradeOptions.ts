import { container } from '@/background/ioc'
import { UpgradeService } from '@/common/options/UpgradeService/UpgradeService'

export const upgradeOptions = async () => {
  const upgradeService = container.get(UpgradeService)
  await upgradeService.upgrade()
}
