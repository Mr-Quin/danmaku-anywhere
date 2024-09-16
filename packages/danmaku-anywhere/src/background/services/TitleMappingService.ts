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
    // If mapping already exists, remove it first
    if ((await this.count(mapping.originalTitle)) > 0) {
      this.logger.debug('Title mapping already exists:', mapping)
      await this.remove(mapping.originalTitle)
    }
    this.logger.debug('Adding title mapping:', mapping)
    this.db.add(mapping)
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
