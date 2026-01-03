import { uploadFile } from '@danmaku-anywhere/danmaku-provider/files'
import { inject, injectable } from 'inversify'
import JSZip from 'jszip'
import { NetRequestManager } from '@/background/netRequest/NetrequestManager'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { tryCatch } from '@/common/utils/tryCatch'
import { LogsDbService } from '../Logging/LogsDb.service'

interface DebugData {
  logs: unknown
  dynamicNetRequest: unknown
  enabledRulesets: unknown
  providerConfigs: unknown
  extensionOptions: unknown
  mountConfigs: unknown
  integrationPolicies: unknown
}

@injectable('Singleton')
export class DebugFileService {
  constructor(
    @inject(LogsDbService) private logsDb: LogsDbService,
    @inject(NetRequestManager) private netRequestManager: NetRequestManager,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(MountConfigService) private mountConfigService: MountConfigService,
    @inject(IntegrationPolicyService)
    private integrationPolicyService: IntegrationPolicyService
  ) {}

  async clear() {
    return this.logsDb.clear()
  }

  async upload(): Promise<{ id: string }> {
    const data = await this.collectData()

    const content = JSON.stringify(data)
    const zip = new JSZip()

    zip.file('debug.json', content)
    const blob = await zip.generateAsync({ type: 'blob' })

    const file = new File([blob], 'debug.zip', {
      type: 'application/zip',
    })

    const res = await uploadFile(file)

    return res
  }

  private async collectData(): Promise<DebugData> {
    const getters: { key: keyof DebugData; getter: () => Promise<unknown> }[] =
      [
        {
          key: 'logs',
          getter: () => this.logsDb.exportSorted(),
        },
        {
          key: 'dynamicNetRequest',
          getter: () => this.netRequestManager.getRules(),
        },
        {
          key: 'enabledRulesets',
          getter: () => this.netRequestManager.getEnabledStaticRulesets(),
        },
        {
          key: 'providerConfigs',
          getter: () => this.providerConfigService.getAll(),
        },
        {
          key: 'extensionOptions',
          getter: () => this.extensionOptionsService.get(),
        },
        {
          key: 'mountConfigs',
          getter: () => this.mountConfigService.getAll(),
        },
        {
          key: 'integrationPolicies',
          getter: () => this.integrationPolicyService.getAll(),
        },
      ]

    const data = {} as DebugData

    for (const { key, getter } of getters) {
      const [res, err] = await tryCatch(() => getter())
      if (err) {
        console.error('Failed to get logs', key, err)
        data[key] = err.message
      } else {
        data[key] = res
      }
    }

    return data
  }
}
