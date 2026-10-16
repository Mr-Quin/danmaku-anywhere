import { injectable } from 'inversify'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { OptionsUpgrader } from './OptionsUpgrader'
import type { OptionsRecoveryCopy } from './recoveryCopy'

@injectable('Singleton')
export class RpcOptionsUpgrader implements OptionsUpgrader {
  async ensureUpgraded(): Promise<void> {
    await chromeRpcClient.optionsEnsureUpgraded()
  }

  async upgrade(): Promise<void> {
    await chromeRpcClient.optionsUpgrade()
  }

  async saveRecoveryCopy(key: string): Promise<OptionsRecoveryCopy> {
    const { data } = await chromeRpcClient.optionsSaveRecoveryCopy(key)
    return data
  }

  async resetStore(key: string, copyId: string): Promise<void> {
    await chromeRpcClient.optionsResetStore({ store: key, copyId })
  }
}
