import { inject, injectable } from 'inversify'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface ExtensionOptionsApi {
  get(): Promise<ExtensionOptions>
  update(partial: Partial<ExtensionOptions>): Promise<void>
}

@injectable('Singleton')
export class ExtensionOptionsNamespace implements DevNamespace {
  readonly name = 'extensionOptions'
  readonly description = 'Read/write extension options'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(ExtensionOptionsService)
    private readonly service: ExtensionOptionsService
  ) {
    this.methods = [
      defineMethod({
        name: 'get',
        description: 'Get the current extension options',
        kind: 'read',
        handler: () => this.service.get(),
      }),
      defineMethod({
        name: 'update',
        description: 'Partial update to extension options',
        kind: 'write',
        args: [{ name: 'partial', type: 'Partial<ExtensionOptions>' }],
        handler: (partial: Partial<ExtensionOptions>) =>
          this.service.update(partial),
      }),
    ]
  }
}
