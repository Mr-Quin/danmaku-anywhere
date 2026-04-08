import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultSearchHistory, MAX_SEARCH_HISTORY_ENTRIES } from './constant'
import type { SearchHistoryData } from './schema'

export function addHistoryEntry(
  entries: string[],
  query: string
): string[] | null {
  const trimmed = query.trim()
  if (!trimmed) {
    return null
  }
  const filtered = entries.filter((e) => e !== trimmed)
  return [trimmed, ...filtered].slice(0, MAX_SEARCH_HISTORY_ENTRIES)
}

export function removeHistoryEntry(entries: string[], query: string): string[] {
  return entries.filter((e) => e !== query)
}

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

  async addEntry(query: string) {
    const current = await this.options.get()
    const newEntries = addHistoryEntry(current.entries, query)
    if (newEntries) {
      await this.options.update({ entries: newEntries })
    }
  }

  async removeEntry(query: string) {
    const current = await this.options.get()
    const newEntries = removeHistoryEntry(current.entries, query)
    await this.options.update({ entries: newEntries })
  }

  async clearHistory() {
    await this.options.update({ entries: [] })
  }

  onChange(listener: (data: SearchHistoryData) => void) {
    return this.options.onChange(listener)
  }
}
