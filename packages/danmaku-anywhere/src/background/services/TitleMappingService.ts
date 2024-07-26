import type { TitleMapping } from '@/common/danmaku/types/types'
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

  async mappingExists({ title, source }: TitleMapping) {
    const count = await this.db.where({ title, source }).count()
    return count > 0
  }

  async getMappedTitle(originalTitle: string, source: string) {
    const mapping = await this.db.get({ originalTitle, source })
    return mapping
  }

  async getMappingsBySource(source: string) {
    return this.db.where({ source }).toArray()
  }
}
