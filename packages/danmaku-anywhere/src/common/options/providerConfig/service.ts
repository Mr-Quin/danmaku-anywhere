import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { produce } from 'immer'
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

  async create(input: unknown) {
    const config = await providerConfigSchema.parseAsync(input)

    if (config.isBuiltIn) {
      throw new Error('Cannot create built-in providers')
    }

    const configs = await this.options.get()

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

  async getEnabledProviders() {
    const configs = await this.options.get()
    return configs.filter((config) => config.enabled)
  }

  async getProvidersByType<T extends ProviderConfig['type']>(
    type: T
  ): Promise<Extract<ProviderConfig, { type: T }>[]> {
    const config = await this.options.get()
    return config.filter((config) => config.type === type) as any
  }
}

export const providerConfigService = new ProviderConfigService()
