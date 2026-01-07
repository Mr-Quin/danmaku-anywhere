import { produce } from 'immer'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
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

  async create(input: unknown) {
    const config = await zAiProviderConfig.parseAsync(input)
    const configs = await this.getAll()
    await this.options.set([...configs, config])
    return config
  }

  async update(id: string, partial: Partial<AiProviderConfig>) {
    const configs = await this.getAll()
    const index = configs.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error(`Provider with id ${id} not found`)
    }

    if (id === BUILT_IN_AI_PROVIDER_ID) {
      return
    }

    const newData = produce(configs, (draft) => {
      draft[index] = { ...draft[index], ...partial, id } // Ensure ID doesn't change
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
