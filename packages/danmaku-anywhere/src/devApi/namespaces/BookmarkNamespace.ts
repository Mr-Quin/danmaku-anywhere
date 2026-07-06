import type { Bookmark, EpisodeStub } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type AnyMethodDef, type DevNamespace, defineMethod } from '../registry'

export interface BookmarkApi {
  list(): Promise<Bookmark[]>
  bySeason(seasonId: number): Promise<Bookmark | undefined>
  add(seasonId: number, episodes?: EpisodeStub[]): Promise<Bookmark>
  deleteBySeason(seasonId: number): Promise<void>
}

@injectable('Singleton')
export class BookmarkNamespace implements DevNamespace {
  readonly name = 'bookmark'
  readonly description = 'Read/write bookmarks (IndexedDB)'
  readonly methods: readonly AnyMethodDef[]

  constructor(
    @inject(BookmarkService)
    private readonly service: BookmarkService,
    @inject(DanmakuAnywhereDb)
    private readonly db: DanmakuAnywhereDb
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
        name: 'add',
        description:
          'Insert a bookmark row directly, without the upstream episode fetch',
        kind: 'write',
        args: [
          { name: 'seasonId', type: 'number' },
          { name: 'episodes', type: 'EpisodeStub[]', optional: true },
        ],
        handler: async (seasonId: number, episodes?: EpisodeStub[]) => {
          const season = await this.db.season.get(seasonId)
          if (!season) {
            throw new Error(`Season not found: ${seasonId}`)
          }
          const insert = {
            seasonId,
            episodes: episodes ?? [],
            lastRefreshed: Date.now(),
            timeUpdated: Date.now(),
            version: 1,
          }
          const id = await this.db.bookmark.add(insert)
          return { ...insert, id }
        },
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
