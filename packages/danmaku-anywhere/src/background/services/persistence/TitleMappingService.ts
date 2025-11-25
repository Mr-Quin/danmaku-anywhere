import { injectable } from 'inversify'
import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { invariant, isServiceWorker } from '@/common/utils/utils'

@injectable()
export class TitleMappingService {
  private logger: typeof Logger

  constructor() {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
    this.logger = Logger.sub('[TitleMappingService]')
  }

  async add(map: SeasonMap) {
    const existingSnapshot = await db.seasonMap.get({ key: map.key })
    if (existingSnapshot) {
      const existing = SeasonMap.fromSnapshot(existingSnapshot)
      this.logger.debug('Updating title mapping:', map.toSnapshot())
      const merged = existing.merge(map)
      await db.seasonMap.put(merged.toSnapshot(), existing.key)
    } else {
      this.logger.debug('Adding title mapping:', map.toSnapshot())
      await db.seasonMap.add(map.toSnapshot())
    }
  }

  async remove(key: string) {
    this.logger.debug('Removing title mapping:', key)
    await db.seasonMap.where({ key }).delete()
  }

  async get(key: string) {
    const snapshot = await db.seasonMap.get({ key })
    return snapshot ? SeasonMap.fromSnapshot(snapshot) : undefined
  }

  async getAll() {
    const snapshots = await db.seasonMap.toArray()
    return SeasonMap.reviveAll(snapshots)
  }
}
