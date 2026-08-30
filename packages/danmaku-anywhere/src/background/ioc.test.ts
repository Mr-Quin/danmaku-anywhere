import { describe, expect, it } from 'vitest'
import { AlarmManager } from '@/background/alarm/AlarmManager'
import { ContextMenuManager } from '@/background/contextMenu/ContextMenuManager'
import { NetRequestManager } from '@/background/netRequest/NetrequestManager'
import { PortsManager } from '@/background/ports/PortsManager'
import { RpcManager } from '@/background/rpc/RpcManager'
import { MountConfigTabReloader } from '@/background/scripting/MountConfigTabReloader'
import { ScriptingManager } from '@/background/scripting/ScriptingManager'
import { LogService } from '@/background/services/Logging/Log.service'
import { DanmakuProviderFactory } from '@/background/services/providers/ProviderFactory'
import { ProviderService } from '@/background/services/providers/ProviderService'
import { OptionsManager } from '@/background/syncOptions/OptionsManager'
import { LoggerSymbol } from '@/common/Logger'
import { AiProviderConfigService } from '@/common/options/aiProviderConfig/service'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'
import { NamingRuleService } from '@/common/options/localMatchingRule/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { OptionsServiceFactory } from '@/common/options/OptionsService/OptionServiceFactory'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SearchHistoryService } from '@/common/options/searchHistory/service'
import { UserAuthStore } from '@/common/options/userAuth/service'
import { createBackgroundContainer } from './ioc'

/**
 * Background IoC wiring exposes a fresh, isolated production container.
 * This verifies every service the service-worker entrypoint resolves can be
 * constructed from its production bindings without starting its side effects.
 */
describe('createBackgroundContainer', () => {
  it('constructs every service resolved by the background entrypoint', () => {
    const testContainer = createBackgroundContainer()

    const services = [
      OptionsManager,
      ScriptingManager,
      MountConfigTabReloader,
      RpcManager,
      NetRequestManager,
      AlarmManager,
      PortsManager,
      ProviderService,
      LogService,
      ContextMenuManager,
    ]

    for (const service of services) {
      expect(testContainer.get(service)).toBeInstanceOf(service)
    }
  })

  it('resolves its multi-bound stores as singletons', () => {
    const testContainer = createBackgroundContainer()

    const stores = testContainer.getAll<IStoreService>(StoreServiceSymbol)

    expect(stores.map((store) => store.constructor)).toEqual([
      ExtensionOptionsService,
      DanmakuOptionsService,
      IntegrationPolicyService,
      MountConfigService,
      ProviderConfigService,
      AiProviderConfigService,
      SearchHistoryService,
      NamingRuleService,
      UserAuthStore,
    ])
    expect(testContainer.get(OptionsManager)).toBe(
      testContainer.get(OptionsManager)
    )
  })

  it('provides callable factories', () => {
    const testContainer = createBackgroundContainer()

    expect(testContainer.get(DanmakuProviderFactory)).toBeTypeOf('function')
    expect(testContainer.get(OptionsServiceFactory)).toBeTypeOf('function')
    expect(testContainer.get(LoggerSymbol)).toBeDefined()
  })
})
