import { inject, injectable } from 'inversify'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { invariant, isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class TitleMappingService {
  private logger: ILogger

  constructor(
    @inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
    this.logger = logger.sub('[TitleMappingService]')
  }

  async add(map: SeasonMap) {
    this.logger.debug('Adding/Updating title mapping:', map.toSnapshot())
    await this.db.seasonMap.put(map.toSnapshot())
  }

  async remove(key: string) {
    this.logger.debug('Removing title mapping:', key)
    await this.db.seasonMap.where({ key }).delete()
  }

  async get(key: string) {
    const snapshot = await this.db.seasonMap.get({ key })
    return snapshot ? SeasonMap.fromSnapshot(snapshot) : undefined
  }

  async getAll() {
    const snapshots = await this.db.seasonMap.toArray()
    return SeasonMap.reviveAll(snapshots)
  }
}
