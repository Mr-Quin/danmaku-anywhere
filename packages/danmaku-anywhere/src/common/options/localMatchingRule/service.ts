import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultNamingRuleOptions } from './constant'
import type { NamingRule, NamingRuleOptions } from './schema'

@injectable('Singleton')
export class NamingRuleService implements IStoreService {
  public readonly name = 'localMatchingRule'
  public readonly options: OptionsService<NamingRuleOptions>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory(
      'localMatchingRule',
      defaultNamingRuleOptions,
      this.logger,
      'local'
    ).version(1, {
      upgrade: () => defaultNamingRuleOptions,
    })
  }

  async get() {
    return this.options.get()
  }

  async set(data: NamingRuleOptions, version?: number) {
    return this.options.set(data, version)
  }

  async update(data: Partial<NamingRuleOptions>) {
    return this.options.update(data)
  }

  onChange(listener: (data: NamingRuleOptions) => void) {
    return this.options.onChange(listener)
  }

  async getRuleByTitle(title: string): Promise<NamingRule | undefined> {
    const options = await this.get()
    return options.rules.find((rule) => rule.title === title)
  }

  async getRuleByFolderPath(
    folderPath: string
  ): Promise<NamingRule | undefined> {
    const options = await this.get()
    return options.rules.find((rule) => rule.folderPath === folderPath)
  }

  async addRule(rule: NamingRule) {
    const options = await this.get()

    // Check for duplicate titles (different folder, same title)
    const duplicate = options.rules.find(
      (r) => r.title === rule.title && r.folderPath !== rule.folderPath
    )
    if (duplicate) {
      throw new Error(
        `A naming rule with title "${rule.title}" already exists for folder "${duplicate.folderPath}"`
      )
    }

    const existingIndex = options.rules.findIndex(
      (r) => r.folderPath === rule.folderPath
    )
    const newRules = [...options.rules]

    if (existingIndex >= 0) {
      newRules[existingIndex] = rule
    } else {
      newRules.push(rule)
    }

    await this.update({ rules: newRules })
  }

  async removeRule(folderPath: string) {
    const options = await this.get()
    await this.update({
      rules: options.rules.filter((r) => r.folderPath !== folderPath),
    })
  }

  async removeRules(folderPaths: string[]) {
    const options = await this.get()
    const pathSet = new Set(folderPaths)
    await this.update({
      rules: options.rules.filter((r) => !pathSet.has(r.folderPath)),
    })
  }
}
