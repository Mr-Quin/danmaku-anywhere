import { inject, injectable } from 'inversify'
import { EXTENSION_VERSION } from '@/common/constants'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface RuntimeApi {
  version(): Promise<string>
  reload(): Promise<void>
  runUpgrade(): Promise<void>
}

@injectable('Singleton')
export class RuntimeNamespace implements DevNamespace {
  readonly name = 'runtime'
  readonly description = 'Service worker lifecycle and metadata'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(OptionsUpgradeService)
    private readonly upgradeService: OptionsUpgradeService
  ) {
    this.methods = [
      defineMethod({
        name: 'version',
        description: 'Extension version string',
        kind: 'read',
        handler: () => EXTENSION_VERSION,
      }),
      defineMethod({
        name: 'reload',
        description: 'Reload the extension (chrome.runtime.reload)',
        kind: 'write',
        handler: () => chrome.runtime.reload(),
      }),
      defineMethod({
        name: 'runUpgrade',
        description: 'Run storage migrations explicitly',
        kind: 'write',
        handler: () => this.upgradeService.upgrade(),
      }),
    ]
  }
}
