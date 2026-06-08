import { inject, injectable } from 'inversify'
import { defaultProviderConfigs } from '@/common/options/providerConfig/migration'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
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
    private readonly service: ProviderConfigService
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
        handler: (configs: ProviderConfig[]) =>
          this.service.options.set(configs),
      }),
      defineMethod({
        name: 'toggle',
        description: 'Toggle a provider enabled/disabled',
        kind: 'write',
        args: [
          { name: 'id', type: 'string' },
          { name: 'enabled', type: 'boolean', optional: true },
        ],
        handler: (id: string, enabled?: boolean) =>
          this.service.toggle(id, enabled),
      }),
      defineMethod({
        name: 'reset',
        description: 'Reset provider configs to defaults',
        kind: 'write',
        handler: () => this.service.options.set([...defaultProviderConfigs]),
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
}
