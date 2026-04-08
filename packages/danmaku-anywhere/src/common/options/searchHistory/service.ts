import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultSearchHistory } from './constant'
import type { SearchHistoryData } from './schema'

@injectable('Singleton')
export class SearchHistoryService implements IStoreService {
  public readonly name = 'searchHistory'
  public readonly shouldBackup = false
  public readonly options: OptionsService<SearchHistoryData>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory(
      'searchHistory',
      defaultSearchHistory,
      this.logger,
      'local'
    ).version(1, {
      upgrade: (data) => data,
    })
  }

  async get() {
    return this.options.get()
  }

  async set(data: SearchHistoryData, version?: number) {
    return this.options.set(data, version)
  }

  async update(data: Partial<SearchHistoryData>) {
    return this.options.update(data)
  }

  onChange(listener: (data: SearchHistoryData) => void) {
    return this.options.onChange(listener)
  }
}
