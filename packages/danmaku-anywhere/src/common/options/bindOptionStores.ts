import type { ContainerModuleLoadOptions } from 'inversify'
import { AiProviderConfigService } from './aiProviderConfig/service'
import { DanmakuOptionsService } from './danmakuOptions/service'
import { ExtensionOptionsService } from './extensionOptions/service'
import {
  type IStoreService,
  StoreServiceSymbol,
  UpgradableOptionStores,
} from './IStoreService'
import { IntegrationPolicyService } from './integrationPolicyStore/service'
import { NamingRuleService } from './localMatchingRule/service'
import { MountConfigService } from './mountConfig/service'
import { ProviderConfigService } from './providerConfig/service'
import { SearchHistoryService } from './searchHistory/service'
import { UserAuthStore } from './userAuth/service'

// The order is the order the upgrade runs the stores in.
export function bindOptionStores({ bind }: ContainerModuleLoadOptions): void {
  bind(StoreServiceSymbol).toService(ExtensionOptionsService)
  bind(StoreServiceSymbol).toService(DanmakuOptionsService)
  bind(StoreServiceSymbol).toService(IntegrationPolicyService)
  bind(StoreServiceSymbol).toService(MountConfigService)
  bind(StoreServiceSymbol).toService(ProviderConfigService)
  bind(StoreServiceSymbol).toService(AiProviderConfigService)
  bind(StoreServiceSymbol).toService(SearchHistoryService)
  bind(StoreServiceSymbol).toService(NamingRuleService)
  bind(StoreServiceSymbol).toService(UserAuthStore)

  // A single binding, unlike the multi-binding above, fails to resolve where
  // it is missing, so the upgrade service cannot be built in a content script
  // or the extension popup.
  bind(UpgradableOptionStores).toDynamicValue((context) => {
    return context.getAll<IStoreService>(StoreServiceSymbol)
  })
}
