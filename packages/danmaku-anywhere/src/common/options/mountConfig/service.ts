import { produce } from 'immer'
import {
  createMountConfig,
  defaultMountConfig,
} from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigInputSchema } from '@/common/options/mountConfig/schema'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
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
    const config = await mountConfigInputSchema.parseAsync(input)

    const configs = await this.options.get()

    await this.options.set([...configs, config])

    return config
  }

  async createByUrl(urlInput: string) {
    const url = new URL(urlInput)
    const pattern = url.origin + '/*'
    const input = createMountConfig(pattern)
    input.mediaQuery = 'video'
    input.name = url.hostname
    input.enabled = true
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

export const mountConfigService = new MountConfigService()
