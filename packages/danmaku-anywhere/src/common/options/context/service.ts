import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { ProviderContext } from './schema'

const defaultContext: ProviderContext = {
  providerId: undefined,
  providerType: undefined,
}

const providerContextOptions = new OptionsService<ProviderContext>(
  'providerContext',
  defaultContext,
  'session'
).version(1, {
  upgrade: (data) => data,
})

class ProviderContextService {
  public readonly options = providerContextOptions

  async setProvider(
    providerId: string,
    providerType: ProviderContext['providerType']
  ) {
    await this.options.set({
      providerId,
      providerType,
    })
  }

  async getProvider(): Promise<ProviderContext> {
    return this.options.get()
  }

  async clearProvider() {
    await this.options.set(defaultContext)
  }

  async getProviderId(): Promise<string | undefined> {
    const context = await this.options.get()
    return context.providerId
  }
}

export const providerContextService = new ProviderContextService()
