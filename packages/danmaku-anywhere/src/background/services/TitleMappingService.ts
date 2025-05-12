import { Logger } from '@/common/Logger'
import type { SeasonMap, db } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class TitleMappingService {
  private logger: typeof Logger

  constructor(private table: typeof db.seasonMap) {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
    this.logger = Logger.sub('[TitleMappingService]')
  }

  async add(map: SeasonMap) {
    const existing = await this.table.get({ key: map.key })
    if (existing) {
      this.logger.debug('Updating title mapping:', map)
      this.table.put(map, existing.key)
    } else {
      this.logger.debug('Adding title mapping:', map)
      this.table.add(map)
    }
  }

  async remove(key: string) {
    this.logger.debug('Removing title mapping:', key)
    await this.table.where({ key }).delete()
  }

  async get(key: string) {
    return this.table.get({ key })
  }
}
