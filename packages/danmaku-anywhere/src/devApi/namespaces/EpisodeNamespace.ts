import type {
  Episode,
  EpisodeInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface EpisodeApi {
  add(insert: EpisodeInsert): Promise<Episode>
  get(id: number): Promise<Episode | undefined>
}

@injectable('Singleton')
export class EpisodeNamespace implements DevNamespace {
  readonly name = 'episode'
  readonly description = 'Read/write persisted episodes (IndexedDB)'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(DanmakuService)
    private readonly service: DanmakuService
  ) {
    this.methods = [
      defineMethod({
        name: 'add',
        description: 'Insert an episode (with comments) directly',
        kind: 'write',
        args: [{ name: 'insert', type: 'EpisodeInsert' }],
        handler: (insert: EpisodeInsert) => this.service.upsert(insert),
      }),
      defineMethod({
        name: 'get',
        description: 'Fetch a persisted episode by id',
        kind: 'read',
        args: [{ name: 'id', type: 'number' }],
        handler: async (id: number) => {
          const res = await this.service.filter({ ids: [id] })
          return res[0]
        },
      }),
    ]
  }
}
