import { inject, injectable } from 'inversify'
import { Logger } from '@/background/backgroundLogger'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { invariant, isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class TitleMappingService {
  private logger: typeof Logger

  constructor(@inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb) {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
    this.logger = Logger.sub('[TitleMappingService]')
  }

  async add(map: SeasonMap) {
    const existingSnapshot = await this.db.seasonMap.get({ key: map.key })
    if (existingSnapshot) {
      const existing = SeasonMap.fromSnapshot(existingSnapshot)
      this.logger.debug('Updating title mapping:', map.toSnapshot())
      const merged = existing.merge(map)
      await this.db.seasonMap.put(merged.toSnapshot(), existing.key)
    } else {
      this.logger.debug('Adding title mapping:', map.toSnapshot())
      await this.db.seasonMap.add(map.toSnapshot())
    }
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
