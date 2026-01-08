import { produce } from 'immer'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  createMountConfig,
  defaultMountConfig,
} from '@/common/options/mountConfig/constant'
import type {
  AutomationMode,
  MountConfig,
} from '@/common/options/mountConfig/schema'
import {
  DEFAULT_MOUNT_CONFIG_AI_CONFIG,
  mountConfigInputSchema,
} from '@/common/options/mountConfig/schema'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { PrevOptions } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'
import { BUILT_IN_AI_PROVIDER_ID } from '../aiProviderConfig/constant'
import { migrateMountConfigV4V5 } from './migrations/migrateMountConfigV4V5'

@injectable('Singleton')
export class MountConfigService implements IStoreService {
  public readonly options: OptionsService<MountConfig[]>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<MountConfig[]>(
      'mountConfig',
      defaultMountConfig,
      this.logger
    )
      .version(1, {
        upgrade: (data) => data,
      })
      .version(2, {
        upgrade: (data) =>
          data.map((config: PrevOptions) => ({
            ...config,
            enabled: false, // switching to new permission model. disable all configs by default, permission will be asked when enabled
          })),
      })
      .version(3, {
        upgrade: (data) =>
          data.map((config: PrevOptions) =>
            produce<PrevOptions>(config, (draft) => {
              // add id field
              draft.id = getRandomUUID()
              // add integration field
              if (draft.name === 'plex') {
                draft.integration = 1
              } else {
                draft.integration = 0
              }
            })
          ),
      })
      .version(4, {
        upgrade: (data) =>
          data.map((config: PrevOptions) =>
            produce<PrevOptions>(config, (draft) => {
              // Remove existing integration to migrate to new policy based integration
              // User has to manually select the integration policy
              delete draft.integration
            })
          ),
      })
      .version(5, {
        // Add automation mode, either manual, xpath, or ai
        upgrade: (data, context) => migrateMountConfigV4V5(data, context),
      })
      .version(6, {
        // add ai config
        upgrade: (data) => {
          return data.map((config: PrevOptions) => ({
            ...config,
            ai: {
              providerId: BUILT_IN_AI_PROVIDER_ID,
            },
          }))
        },
      })
  }

  async create(input: unknown) {
    const config = await mountConfigInputSchema.parseAsync(input)

    const configs = await this.options.get()

    await this.options.set([...configs, config])

    return config
  }

  // can throw if the url is invalid
  async createByUrl(urlInput: string) {
    const url = new URL(urlInput)
    const pattern = url.origin + '/*'
    const input = createMountConfig({
      patterns: [pattern],
      name: url.origin,
      enabled: true,
    })
    return this.create(input)
  }

  async get(id: string) {
    const configs = await this.options.get()

    return configs.find((item) => item.id === id)
  }

  async getAll() {
    return this.options.get()
  }

  async update(id: string, config: Partial<MountConfig>) {
    const configs = await this.options.get()

    const prevConfig = configs.find((item) => item.id === id)

    if (!prevConfig) throw new Error(`Config not found: "${id}"`)

    const newConfig = await mountConfigInputSchema.parseAsync({
      ...prevConfig,
      ...config,
    })

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = newConfig
    })

    await this.options.set(newConfigs)

    return newConfig
  }

  async changeMode(id: string, mode: AutomationMode) {
    const configs = await this.options.get()

    const index = configs.findIndex((item) => item.id === id)

    if (index === -1) {
      throw new Error(`Config not found: "${id}" when changing mode`)
    }

    const newData = produce(configs, (draft) => {
      draft[index].mode = mode
      // add default ai config if no ai config exists
      if (mode === 'ai' && !draft[index].ai) {
        draft[index].ai = DEFAULT_MOUNT_CONFIG_AI_CONFIG
      }
    })

    await this.options.set(newData)
  }

  async delete(id: string) {
    const configs = await this.options.get()

    const index = configs.findIndex((item) => item.id === id)

    if (index === -1) throw new Error(`Config not found: "${id}" when deleting`)

    const newData = produce(configs, (draft) => {
      draft.splice(index, 1)
    })

    await this.options.set(newData)
  }

  async import(config: MountConfig) {
    const configs = await this.options.get()

    const existing = configs.find((item) => {
      return item.id === config.id
    })

    if (existing) {
      await this.options.set([
        ...configs.filter((item) => item.id !== existing.id),
        config,
      ])
      return existing
    }

    // disable the imported config by default
    await this.options.set([...configs, { ...config, enabled: false }])
    return config
  }

  async unsetIntegration(integrationId: string) {
    const configs = await this.options.get()

    const newData = produce(configs, (draft) => {
      draft.forEach((config) => {
        if (config.integration === integrationId) {
          delete config.integration
        }
      })
    })

    await this.options.set(newData)
  }

  async setIntegration(configId: string, integrationId?: string) {
    const configs = await this.options.get()

    const newData = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === configId)
      draft[index].integration = integrationId
    })

    await this.options.set(newData)
  }

  async reorder(sourceIndex: number, destinationIndex: number) {
    const configs = await this.options.get()

    const newData = produce(configs, (draft) => {
      const [removed] = draft.splice(sourceIndex, 1)
      draft.splice(destinationIndex, 0, removed)
    })

    await this.options.set(newData)
  }
}
