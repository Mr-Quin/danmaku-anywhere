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
    if (await this.mappingExists(mapping)) {
      this.logger.debug('Title mapping already exists:', mapping)
      return
    }
    this.logger.debug('Adding title mapping:', mapping)
    this.db.add(mapping)
  }

  async mappingExists({ title, originalTitle, integration }: TitleMapping) {
    // The originalTitle might change over time, so we need to check both title and originalTitle
    const count = await this.db
      .where({ title, originalTitle, integration })
      .count()
    return count > 0
  }

  async getMappedTitle(key: string, integration: string) {
    const mapping = await this.db.get({ originalTitle: key, integration })
    return mapping
  }

  async getMappingsBySource(source: string) {
    return this.db.where({ source }).toArray()
  }
}
