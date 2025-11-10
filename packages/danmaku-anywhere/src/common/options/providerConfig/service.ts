import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { produce } from 'immer'
import { db } from '@/common/db/db'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultProviderConfigs } from './constant'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  DanDanPlayCompatProvider,
  ProviderConfig,
} from './schema'
import { providerConfigSchema } from './schema'
import { assertProviderConfigImpl, assertProviderConfigType } from './utils'

const providerConfigOptions = new OptionsService<ProviderConfig[]>(
  'providerConfig',
  defaultProviderConfigs
).version(1, {
  upgrade: (data: PrevOptions) => {
    return data
  },
})

class ProviderConfigService {
  public readonly options = providerConfigOptions

  async isIdUnique(id: string, excludeId?: string): Promise<boolean> {
    const configs = await this.options.get()
    return !configs.some((item) => item.id === id && item.id !== excludeId)
  }

  async create(input: unknown) {
    const config = await providerConfigSchema.parseAsync(input)

    if (config.isBuiltIn) {
      throw new Error('Cannot create built-in providers')
    }

    const configs = await this.options.get()

    // Check if ID already exists
    const existingConfig = configs.find((item) => item.id === config.id)
    if (existingConfig) {
      throw new Error(`Provider with ID "${config.id}" already exists`)
    }

    await this.options.set([...configs, config])

    return config
  }

  async get(id: string): Promise<ProviderConfig | undefined> {
    const configs = await this.options.get()
    return configs.find((item) => item.id === id)
  }

  async getAll() {
    return this.options.get()
  }

  async getFirstAutomaticProvider(): Promise<
    BuiltInDanDanPlayProvider | DanDanPlayCompatProvider
  > {
    const configs = await this.options.get()
    const config = configs.find(
      (item) => item.impl === DanmakuSourceType.DanDanPlay
    )
    if (!config) {
      throw new Error('No automatic provider found')
    }
    assertProviderConfigImpl(config, DanmakuSourceType.DanDanPlay)
    return config
  }

  async getBuiltInDanDanPlay(): Promise<BuiltInDanDanPlayProvider> {
    const config = await this.get('dandanplay')
    if (!config) {
      throw new Error('Built-in DanDanPlay provider not found')
    }
    assertProviderConfigType(config, 'DanDanPlay')
    return config
  }

  async getBuiltInBilibili(): Promise<BuiltInBilibiliProvider> {
    const config = await this.get('bilibili')
    if (!config) {
      throw new Error('Built-in Bilibili provider not found')
    }
    assertProviderConfigType(config, 'Bilibili')
    return config as BuiltInBilibiliProvider
  }

  async update<T extends ProviderConfig>(
    id: string,
    config: Partial<T>
  ): Promise<T> {
    const configs = await this.options.get()
    const prevConfig = configs.find((item) => item.id === id)

    if (!prevConfig) {
      throw new Error(`Provider not found: "${id}"`)
    }

    const nextConfig = { ...prevConfig, ...config } as T

    // If ID is being changed, check if the new ID already exists
    if (config.id && config.id !== id) {
      const existingConfig = configs.find((item) => item.id === config.id)
      if (existingConfig) {
        throw new Error(`Provider with ID "${config.id}" already exists`)
      }
    }

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = nextConfig
    })

    await this.options.set(newConfigs)

    return nextConfig
  }

  async delete(id: string) {
    const configs = await this.options.get()
    const config = configs.find((item) => item.id === id)

    if (!config) {
      throw new Error(`Provider not found: "${id}" when deleting`)
    }

    if (config.isBuiltIn) {
      throw new Error('Cannot delete built-in providers')
    }

    // Delete all associated data
    await db.transaction('rw', db.season, db.episode, async () => {
      // Find all seasons using this config
      const seasons = await db.season.where({ providerConfigId: id }).toArray()
      const seasonIds = seasons.map((s) => s.id)

      // Delete episodes for these seasons
      if (seasonIds.length > 0) {
        await db.episode.where('seasonId').anyOf(seasonIds).delete()
      }

      // Delete the seasons
      await db.season.where({ providerConfigId: id }).delete()
    })

    // Delete the config
    const newData = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft.splice(index, 1)
    })

    await this.options.set(newData)
  }

  async toggle(id: string, enabled?: boolean) {
    const config = await this.get(id)

    if (!config) {
      throw new Error(`Provider not found: "${id}"`)
    }

    return this.update(id, {
      enabled: enabled ?? !config.enabled,
    })
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

export const providerConfigService = new ProviderConfigService()
