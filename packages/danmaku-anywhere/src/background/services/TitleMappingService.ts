import { Logger } from '@/common/Logger'
import { db } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class TitleMappingService {
  private logger: typeof Logger

  constructor(private table: typeof db.seasonMap) {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker',
    )
    this.logger = Logger.sub('[TitleMappingService]')
  }

  async add(key: string, seasonId: number) {
    const existing = await this.table.get({ key })
    if (existing) {
      this.logger.debug('Updating title mapping:', key)
      this.table.put({ key, seasonId }, existing.key)
    } else {
      this.logger.debug('Adding title mapping:', key, seasonId)
      this.table.add({ key, seasonId })
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
