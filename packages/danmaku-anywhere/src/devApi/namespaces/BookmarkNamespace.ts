import type { Bookmark } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface BookmarkApi {
  list(): Promise<Bookmark[]>
  bySeason(seasonId: number): Promise<Bookmark | undefined>
  deleteBySeason(seasonId: number): Promise<void>
}

@injectable('Singleton')
export class BookmarkNamespace implements DevNamespace {
  readonly name = 'bookmark'
  readonly description = 'Read/clear bookmarks (IndexedDB)'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(BookmarkService)
    private readonly service: BookmarkService
  ) {
    this.methods = [
      defineMethod({
        name: 'list',
        description: 'List all bookmarks',
        kind: 'read',
        handler: () => this.service.getAll(),
      }),
      defineMethod({
        name: 'bySeason',
        description: 'Get the bookmark for a season, if any',
        kind: 'read',
        args: [{ name: 'seasonId', type: 'number' }],
        handler: (seasonId: number) => this.service.getBySeason(seasonId),
      }),
      defineMethod({
        name: 'deleteBySeason',
        description: 'Delete bookmark for a season',
        kind: 'write',
        args: [{ name: 'seasonId', type: 'number' }],
        handler: (seasonId: number) => this.service.deleteBySeason(seasonId),
      }),
    ]
  }
}
