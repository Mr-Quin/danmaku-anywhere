import { produce } from 'immer'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { invariant } from '@/common/utils/utils'
import { BUILT_IN_AI_PROVIDER, BUILT_IN_AI_PROVIDER_ID } from './constant'
import { type AiProviderConfig, zAiProviderConfig } from './schema'

@injectable('Singleton')
export class AiProviderConfigService implements IStoreService {
  public readonly options: OptionsService<AiProviderConfig[]>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<AiProviderConfig[]>(
      'aiProviderConfig',
      [BUILT_IN_AI_PROVIDER],
      this.logger
    ).version(1, {
      upgrade: (data) => data,
    })
  }

  async getAll(): Promise<AiProviderConfig[]> {
    return this.options.get()
  }

  async get(id: string): Promise<AiProviderConfig | undefined> {
    const configs = await this.getAll()
    return configs.find((c) => c.id === id)
  }

  async mustGet(id: string): Promise<AiProviderConfig> {
    const config = await this.get(id)
    invariant(config !== undefined, `Provider with id ${id} not found`)
    return config
  }

  async create(input: unknown) {
    const config = await zAiProviderConfig.parseAsync(input)
    const configs = await this.getAll()
    await this.options.set([...configs, config])
    return config
  }

  async update(id: string, partial: Partial<AiProviderConfig>) {
    const configs = await this.getAll()
    const index = configs.findIndex((c) => c.id === id)

    invariant(index !== -1, `Provider with id ${id} not found`)

    if (id === BUILT_IN_AI_PROVIDER_ID) {
      return
    }

    invariant(
      partial.provider !== 'built-in',
      'Cannot update built-in provider'
    )
    invariant(
      partial.provider === configs[index].provider,
      'Provider type cannot be changed'
    )

    const newData = produce(configs, (draft) => {
      // safe cast since we checked provider type above
      draft[index] = { ...draft[index], ...partial, id } as AiProviderConfig
    })
    await this.options.set(newData)
  }

  async delete(id: string) {
    if (id === BUILT_IN_AI_PROVIDER_ID) {
      throw new Error('Cannot delete built-in provider')
    }
    const configs = await this.getAll()
    const newData = configs.filter((c) => c.id !== id)
    await this.options.set(newData)
  }
}
