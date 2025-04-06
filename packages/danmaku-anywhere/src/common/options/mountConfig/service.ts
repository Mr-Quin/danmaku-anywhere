import { produce } from 'immer'

import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultMountConfig } from '@/common/options/mountConfig/constant'
import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'
import {
  mountConfigInputListSchema,
  mountConfigInputSchema,
} from '@/common/options/mountConfig/schema'
import { getRandomUUID } from '@/common/utils/utils'

const mountConfigOptions = new OptionsService<MountConfig[]>(
  'mountConfig',
  defaultMountConfig
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) => ({
        ...config,
        enabled: false, // switching to new permission model. disable all configs by default, permission will be asked when enabled
      })),
  })
  .version(3, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) =>
        produce(config, (draft: PrevOptions) => {
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
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) =>
        produce(config, (draft: PrevOptions) => {
          // Remove existing integration to migrate to new policy based integration
          // User has to manually select the integration policy
          delete draft.integration
        })
      ),
  })

class MountConfigService {
  public readonly options = mountConfigOptions

  async create(input: unknown) {
    const config = {
      ...(await mountConfigInputSchema.parseAsync(input)),
      id: getRandomUUID(),
    } satisfies MountConfig

    const configs = await this.options.get()

    await this.options.set([...configs, config])

    return config
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

    const newConfig = { ...prevConfig, ...config }

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = newConfig
    })

    await this.options.set(newConfigs)

    return newConfig
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

  async import(configs: MountConfigInput[]) {
    const currentConfigs = await this.options.get()

    const parsed = await mountConfigInputListSchema.parseAsync(configs)

    const newData = [
      ...currentConfigs,
      ...parsed.map((config) => ({
        ...config,
        enabled: false,
        id: getRandomUUID(),
      })),
    ]

    await this.options.set(newData)
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
}

export const mountConfigService = new MountConfigService()
