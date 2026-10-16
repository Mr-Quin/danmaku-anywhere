import { injectable } from 'inversify'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { OptionsUpgrader } from './OptionsUpgrader'

@injectable('Singleton')
export class RpcOptionsUpgrader implements OptionsUpgrader {
  async ensureUpgraded(): Promise<void> {
    await chromeRpcClient.optionsEnsureUpgraded()
  }

  async upgrade(): Promise<void> {
    await chromeRpcClient.optionsUpgrade()
  }
}
