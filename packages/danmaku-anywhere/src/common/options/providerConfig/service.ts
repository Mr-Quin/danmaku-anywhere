import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { produce } from 'immer'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isServiceWorker } from '@/common/utils/utils'
import { defaultProviderConfigs } from './constant'
import type {
  BuiltInBilibiliProvider,
  BuiltInDanDanPlayProvider,
  BuiltInTencentProvider,
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

  async mustGet(id: string): Promise<ProviderConfig> {
    const config = await this.get(id)
    if (!config) {
      throw new Error(`Provider config with ID "${id}" not found.`)
    }
    return config
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

  async getBuiltInTencent(): Promise<BuiltInTencentProvider> {
    const config = await this.get('tencent')
    if (!config) {
      throw new Error('Built-in Tencent provider not found')
    }
    assertProviderConfigType(config, 'Tencent')
    return config as BuiltInTencentProvider
  }

  async update<T extends ProviderConfig>(
    id: string,
    config: Partial<T>
  ): Promise<T> {
    const configs = await this.options.get()
    const prevConfig = configs.find((item) => item.id === id)

    if (!prevConfig) {
      throw new Error(`Provider with ID "${id}" not found.`)
    }

    const nextConfig = { ...prevConfig, ...config } as T

    if (config.id && config.id !== id) {
      throw new Error('Provider ID cannot be changed.')
    }

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = nextConfig
    })

    await this.options.set(newConfigs)

    return nextConfig
  }

  async delete(id: string) {
    // Deletion involves deleting seasons and episodes, which must be done in the background script
    // So this method just calls the background script to do the deletion
    await chromeRpcClient.providerConfigDelete(id)
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

export async function deleteProviderConfig(id: string) {
  if (!isServiceWorker()) {
    throw new Error('Must called from background script.')
  }

  const configs = await providerConfigService.options.get()
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

  await providerConfigService.options.set(newData)
}
