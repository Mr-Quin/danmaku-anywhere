import 'reflect-metadata'
import { Container } from 'inversify'
import { GenAIService } from './services/GenAIService'
import { IconService } from './services/IconService'
import { KazumiService } from './services/KazumiService'
import { DanmakuService } from './services/persistence/DanmakuService'
import { SeasonService } from './services/persistence/SeasonService'
import { TitleMappingService } from './services/persistence/TitleMappingService'
import { ProviderRegistry } from './services/providers/ProviderRegistry'
import { ProviderService } from './services/providers/ProviderService'
import { SERVICE_TYPES } from './services/types'

const container = new Container()

container
  .bind<SeasonService>(SERVICE_TYPES.SeasonService)
  .to(SeasonService)
  .inSingletonScope()
container
  .bind<DanmakuService>(SERVICE_TYPES.DanmakuService)
  .to(DanmakuService)
  .inSingletonScope()
container
  .bind<TitleMappingService>(SERVICE_TYPES.TitleMappingService)
  .to(TitleMappingService)
  .inSingletonScope()
container
  .bind<ProviderRegistry>(SERVICE_TYPES.ProviderRegistry)
  .to(ProviderRegistry)
  .inSingletonScope()
container
  .bind<ProviderService>(SERVICE_TYPES.ProviderService)
  .to(ProviderService)
  .inSingletonScope()
container
  .bind<KazumiService>(SERVICE_TYPES.KazumiService)
  .to(KazumiService)
  .inSingletonScope()
container
  .bind<IconService>(SERVICE_TYPES.IconService)
  .to(IconService)
  .inSingletonScope()
container
  .bind<GenAIService>(SERVICE_TYPES.GenAIService)
  .to(GenAIService)
  .inSingletonScope()

export { container }
