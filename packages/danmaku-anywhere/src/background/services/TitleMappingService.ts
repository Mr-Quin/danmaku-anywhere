import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import type { SeasonMap } from '@/common/seasonMap/types'
import { invariant, isServiceWorker } from '@/common/utils/utils'

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
    const existing = await db.seasonMap.get({ key: map.key })
    if (existing) {
      this.logger.debug('Updating title mapping:', map)
      await db.seasonMap.put(map, existing.key)
    } else {
      this.logger.debug('Adding title mapping:', map)
      await db.seasonMap.add(map)
    }
  }

  async remove(key: string) {
    this.logger.debug('Removing title mapping:', key)
    await db.seasonMap.where({ key }).delete()
  }

  async get(key: string) {
    return db.seasonMap.get({ key })
  }

  async getAll() {
    return db.seasonMap.toArray()
  }
}
