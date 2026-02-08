import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger } from '@/common/Logger'
import { StandaloneUpgradeService } from '@/common/standalone/StandaloneUpgradeService'

let readyPromise: Promise<void> | null = null

export const ensureStandaloneReady = async () => {
  if (!IS_STANDALONE_RUNTIME) {
    return
  }

  if (!readyPromise) {
    const upgradeService = uiContainer.get(StandaloneUpgradeService)
    readyPromise = upgradeService.upgrade().catch((error) => {
      Logger.error('Standalone upgrade failed', error)
      throw error
    })
  }

  await readyPromise
}
