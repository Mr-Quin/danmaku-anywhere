import type { Season, SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface SeasonApi {
  list(): Promise<Season[]>
  get(id: number): Promise<Season | undefined>
  add(insert: SeasonInsert): Promise<Season>
  delete(id: number): Promise<void>
}

@injectable('Singleton')
export class SeasonNamespace implements DevNamespace {
  readonly name = 'season'
  readonly description = 'Read/write persisted seasons (IndexedDB)'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(SeasonService)
    private readonly service: SeasonService
  ) {
    this.methods = [
      defineMethod({
        name: 'list',
        description: 'List all persisted seasons',
        kind: 'read',
        handler: () => this.service.getAll({ includeEmpty: true }),
      }),
      defineMethod({
        name: 'get',
        description: 'Get a season by id',
        kind: 'read',
        args: [{ name: 'id', type: 'number' }],
        handler: (id: number) => this.service.getById(id),
      }),
      defineMethod({
        name: 'add',
        description: 'Insert a season directly (bypasses provider search)',
        kind: 'write',
        args: [{ name: 'insert', type: 'SeasonInsert' }],
        handler: (insert: SeasonInsert) => this.service.upsert(insert),
      }),
      defineMethod({
        name: 'delete',
        description: 'Delete a season (cascades to episodes + bookmarks)',
        kind: 'write',
        args: [{ name: 'id', type: 'number' }],
        handler: (id: number) => this.service.delete({ id }),
      }),
    ]
  }
}
