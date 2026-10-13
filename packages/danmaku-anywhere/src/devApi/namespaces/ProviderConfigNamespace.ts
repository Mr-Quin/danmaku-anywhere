import { inject, injectable } from 'inversify'
import { ProviderConfigWriter } from '@/background/services/providers/ProviderConfigWriter'
import {
  BUILTIN_SOURCES,
  createBuiltinConfig,
} from '@/common/options/providerConfig/builtin'
import {
  type ProviderConfig,
  providerConfigSchema,
} from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface ProviderConfigApi {
  list(): Promise<ProviderConfig[]>
  get(id: string): Promise<ProviderConfig | undefined>
  set(configs: ProviderConfig[]): Promise<void>
  toggle(id: string, enabled?: boolean): Promise<ProviderConfig>
  reset(): Promise<void>
  hasSeeded(): Promise<boolean>
  markSeeded(): Promise<void>
}

@injectable('Singleton')
export class ProviderConfigNamespace implements DevNamespace {
  readonly name = 'providerConfig'
  readonly description = 'Read/write provider configs'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(ProviderConfigService)
    private readonly service: ProviderConfigService,
    @inject(ProviderConfigWriter)
    private readonly writer: ProviderConfigWriter
  ) {
    this.methods = [
      defineMethod({
        name: 'list',
        description: 'List all provider configs',
        kind: 'read',
        handler: () => this.service.getAll(),
      }),
      defineMethod({
        name: 'get',
        description: 'Get a single provider config by id',
        kind: 'read',
        args: [{ name: 'id', type: 'string' }],
        handler: (id: string) => this.service.get(id),
      }),
      defineMethod({
        name: 'set',
        description: 'Replace all provider configs in storage',
        kind: 'write',
        args: [{ name: 'configs', type: 'ProviderConfig[]' }],
        handler: (configs: ProviderConfig[]) => this.replaceStored(configs),
      }),
      defineMethod({
        name: 'toggle',
        description: 'Toggle a provider enabled/disabled',
        kind: 'write',
        args: [
          { name: 'id', type: 'string' },
          { name: 'enabled', type: 'boolean', optional: true },
        ],
        handler: async (id: string, enabled?: boolean) => {
          const config = await this.service.mustGet(id)
          return this.writer.setEnabled(id, enabled ?? !config.enabled)
        },
      }),
      defineMethod({
        name: 'reset',
        description: 'Reset provider configs to defaults',
        kind: 'write',
        handler: () =>
          this.replaceStored(BUILTIN_SOURCES.map(createBuiltinConfig)),
      }),
      defineMethod({
        name: 'hasSeeded',
        description: 'Whether the preloaded providers have been seeded',
        kind: 'read',
        handler: () => this.service.hasSeeded(),
      }),
      defineMethod({
        name: 'markSeeded',
        description: 'Mark the preloaded providers as seeded',
        kind: 'write',
        handler: () => this.service.markSeeded(),
      }),
    ]
  }

  // Seeds the store as it is, past the writer's checks, because specs need the
  // states real profiles reach without them: configs synced from a device that
  // has a manifest this one lacks, or saved before these checks existed. The
  // write still takes its turn in the store's queue.
  private async replaceStored(configs: unknown[]): Promise<void> {
    const parsed = configs.map((config) => providerConfigSchema.parse(config))
    await this.service.options.transform(() => parsed)
  }
}
