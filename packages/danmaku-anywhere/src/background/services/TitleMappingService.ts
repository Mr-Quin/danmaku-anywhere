import type { TitleMapping } from '@/common/danmaku/models/titleMapping'
import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class TitleMappingService {
  private db = db.titleMapping
  private logger: typeof Logger

  constructor() {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
    this.logger = Logger.sub('[TitleMappingService]')
  }

  async add(mapping: TitleMapping) {
    const existing = await this.count(mapping.originalTitle)
    // If there are more than 1 mapping for the given key, remove all of them
    if (existing > 1) {
      this.logger.debug(
        'Multiple title mapping already exists for key:',
        mapping.originalTitle
      )
      await this.remove(mapping.originalTitle)
    } else if (existing === 1) {
      this.logger.debug('Updating title mapping:', mapping)
      this.db.update(mapping.originalTitle, mapping)
    } else {
      this.logger.debug('Adding title mapping:', mapping)
      this.db.add(mapping)
    }
  }

  async count(key: string) {
    return this.db.where({ originalTitle: key }).count()
  }

  async remove(key: string) {
    this.logger.debug('Removing title mapping:', key)
    await this.db.where({ originalTitle: key }).delete()
  }

  async getMappedTitle(key: string) {
    // Clean up old mappings
    if ((await this.count(key)) > 1) {
      await this.remove(key)
      return
    }
    return this.db.get({ originalTitle: key })
  }
}
