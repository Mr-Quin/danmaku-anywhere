import 'reflect-metadata'
import { Container, ContainerModule } from 'inversify'
import { IS_DA_E2E } from '@/common/constants'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
  optionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import {
  type IMaskProviderFactory,
  MaskProviderFactory,
  maskProviderFactory,
  mockMaskProviderFactory,
} from '@/content/player/occlusion/maskProviderFactory'
import { type ILogger, Logger, LoggerSymbol } from '../Logger'
import { i18n } from '../localization/i18n'
import { isLanguage } from '../localization/language'
import { bindOptionStores } from '../options/bindOptionStores'
import { ExtensionOptionsService } from '../options/extensionOptions/service'
import {
  type OptionsUpgrader,
  OptionsUpgraderSymbol,
} from '../options/upgrade/OptionsUpgrader'
import { OptionsUpgradeService } from '../options/upgrade/OptionsUpgradeService'
import { RpcOptionsUpgrader } from '../options/upgrade/RpcOptionsUpgrader'

export const uiContainerModule = new ContainerModule((options) => {
  const { bind } = options
  bindOptionStores(options)

  bind<IOptionsServiceFactory>(OptionsServiceFactory).toFactory(
    optionsServiceFactory
  )

  bind<IMaskProviderFactory>(MaskProviderFactory).toFactory(
    // e2e uses a deterministic mock mask so specs don't load the real ML segmenter.
    IS_DA_E2E ? mockMaskProviderFactory : maskProviderFactory
  )

  bind<ILogger>(LoggerSymbol).toConstantValue(Logger)

  // The standalone build has no service worker, so the page upgrades its own
  // stores.
  if (IS_STANDALONE_RUNTIME) {
    bind<OptionsUpgrader>(OptionsUpgraderSymbol).toService(
      OptionsUpgradeService
    )
  } else {
    bind<OptionsUpgrader>(OptionsUpgraderSymbol).to(RpcOptionsUpgrader)
  }
})

export function createUiContainer(): Container {
  const container = new Container({ autobind: true, defaultScope: 'Singleton' })
  container.load(uiContainerModule)
  return container
}

// The standalone build loads the popup and the content controller from one
// module graph, so both entrypoints call this against the same container.
const bootstrappedContainers = new WeakSet<Container>()

export function bootstrapUiLanguage(container: Container): void {
  if (bootstrappedContainers.has(container)) {
    return
  }
  bootstrappedContainers.add(container)

  const extensionOptions = container.get(ExtensionOptionsService)

  // Read ahead of the upgrade so the screens shown while it runs or after it
  // fails are in the user's language. The upgraded value below still wins.
  extensionOptions.options
    .readUnblocked()
    .then((options: { lang?: unknown }) => {
      if (isLanguage(options.lang)) {
        void i18n.changeLanguage(options.lang)
      }
    })
    .catch(() => undefined)

  extensionOptions
    .get()
    .then((options) => {
      void i18n.changeLanguage(options.lang)
    })
    .catch(() => {
      Logger.error(
        'Failed to get language from extension options, fallback to default language'
      )
    })
}

export function requestOptionsUpgrade(container: Container): void {
  container
    .get<OptionsUpgrader>(OptionsUpgraderSymbol)
    .ensureUpgraded()
    .catch((error) => {
      Logger.debug('Options upgrade did not complete', error)
    })
}

export const uiContainer = createUiContainer()
