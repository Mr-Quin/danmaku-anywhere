import { inject, injectable } from 'inversify'
import { UpgradeService } from '@/background/syncOptions/UpgradeService/UpgradeService'
import { EXTENSION_VERSION } from '@/common/constants'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

@injectable('Singleton')
export class RuntimeNamespace implements DevNamespace {
  readonly name = 'runtime'
  readonly description = 'Service worker lifecycle and metadata'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(UpgradeService)
    private readonly upgradeService: UpgradeService
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
        description:
          'Run storage migrations explicitly. Used by tests to exercise migration paths without relying on chrome.runtime.onInstalled side effects.',
        kind: 'write',
        handler: () => this.upgradeService.upgrade(),
      }),
    ]
  }
}
