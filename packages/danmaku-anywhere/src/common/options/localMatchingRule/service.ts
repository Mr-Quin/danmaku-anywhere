import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultLocalMatchingRuleOptions } from './constant'
import type { LocalMatchingRule, LocalMatchingRuleOptions } from './schema'

@injectable('Singleton')
export class LocalMatchingRuleService implements IStoreService {
  public readonly name = 'localMatchingRule'
  public readonly options: OptionsService<LocalMatchingRuleOptions>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory(
      'localMatchingRule',
      defaultLocalMatchingRuleOptions,
      this.logger,
      'local'
    ).version(1, {
      upgrade: (data) => data,
    })
  }

  async get() {
    return this.options.get()
  }

  async set(data: LocalMatchingRuleOptions, version?: number) {
    return this.options.set(data, version)
  }

  async update(data: Partial<LocalMatchingRuleOptions>) {
    return this.options.update(data)
  }

  onChange(listener: (data: LocalMatchingRuleOptions) => void) {
    return this.options.onChange(listener)
  }

  async getRuleByMapKey(
    mapKey: string
  ): Promise<LocalMatchingRule | undefined> {
    const options = await this.get()
    return options.rules.find((rule) => rule.mapKey === mapKey)
  }

  async addRule(rule: LocalMatchingRule) {
    const options = await this.get()
    const existingIndex = options.rules.findIndex(
      (r) => r.mapKey === rule.mapKey
    )
    const newRules = [...options.rules]

    if (existingIndex >= 0) {
      newRules[existingIndex] = rule
    } else {
      newRules.push(rule)
    }

    await this.update({ rules: newRules })
  }

  async removeRule(mapKey: string) {
    const options = await this.get()
    await this.update({
      rules: options.rules.filter((r) => r.mapKey !== mapKey),
    })
  }

  async removeRules(mapKeys: string[]) {
    const options = await this.get()
    const keySet = new Set(mapKeys)
    await this.update({
      rules: options.rules.filter((r) => !keySet.has(r.mapKey)),
    })
  }
}
