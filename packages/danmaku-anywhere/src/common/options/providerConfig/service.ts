import { produce } from 'immer'
import { defaultProviderConfigs } from './constant'
import type {
  BuiltInProvider,
  CustomProvider,
  ProviderConfig,
} from './schema'
import { providerConfigSchema } from './schema'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

const providerConfigOptions = new OptionsService<ProviderConfig[]>(
  'providerConfig',
  defaultProviderConfigs
).version(1, {
  upgrade: (data: PrevOptions) => data,
})

class ProviderConfigService {
  public readonly options = providerConfigOptions

  async create(input: unknown) {
    const config = await providerConfigSchema.parseAsync(input)

    // Only allow creating custom providers
    if (config.type.startsWith('builtin-')) {
      throw new Error('Cannot create built-in providers')
    }

    const configs = await this.options.get()

    await this.options.set([...configs, config as CustomProvider])

    return config
  }

  async get(id: string) {
    const configs = await this.options.get()
    return configs.find((item) => item.id === id)
  }

  async getAll() {
    return this.options.get()
  }

  async update(id: string, config: Partial<ProviderConfig>) {
    const configs = await this.options.get()
    const prevConfig = configs.find((item) => item.id === id)

    if (!prevConfig) throw new Error(`Provider not found: "${id}"`)

    // For built-in providers, only allow updating enabled and options
    if (prevConfig.type.startsWith('builtin-')) {
      const allowedUpdates: Partial<BuiltInProvider> = {}
      if (config.enabled !== undefined) allowedUpdates.enabled = config.enabled
      if (config.options !== undefined) allowedUpdates.options = config.options as any

      const newConfig = { ...prevConfig, ...allowedUpdates }

      const newConfigs = produce(configs, (draft) => {
        const index = draft.findIndex((item) => item.id === id)
        draft[index] = newConfig
      })

      await this.options.set(newConfigs)
      return newConfig
    }

    // For custom providers, allow updating everything except id and type
    const newConfig = { ...prevConfig, ...config, id: prevConfig.id, type: prevConfig.type }

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = newConfig
    })

    await this.options.set(newConfigs)
    return newConfig
  }

  async delete(id: string) {
    const configs = await this.options.get()
    const config = configs.find((item) => item.id === id)

    if (!config) throw new Error(`Provider not found: "${id}" when deleting`)

    // Prevent deletion of built-in providers
    if (config.type.startsWith('builtin-')) {
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
    if (!config) throw new Error(`Provider not found: "${id}"`)

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
    const configs = await this.options.get()
    return configs.filter((config) => config.type === type) as any
  }
}

export const providerConfigService = new ProviderConfigService()
