import type { ContainerModuleLoadOptions } from 'inversify'
import { AiProviderConfigService } from './aiProviderConfig/service'
import { DanmakuOptionsService } from './danmakuOptions/service'
import { ExtensionOptionsService } from './extensionOptions/service'
import {
  type IOptionStoresProvider,
  type IStoreService,
  OptionStoresProvider,
  StoreServiceSymbol,
} from './IStoreService'
import { IntegrationPolicyService } from './integrationPolicyStore/service'
import { NamingRuleService } from './localMatchingRule/service'
import { MountConfigService } from './mountConfig/service'
import { ProviderConfigService } from './providerConfig/service'
import { SearchHistoryService } from './searchHistory/service'
import { UserAuthStore } from './userAuth/service'

// Every context binds the same stores, so readiness means the same thing in
// the service worker, the popup and a content script.
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

  bind<IOptionStoresProvider>(OptionStoresProvider).toFactory((context) => {
    return () => context.getAll<IStoreService>(StoreServiceSymbol)
  })
}
