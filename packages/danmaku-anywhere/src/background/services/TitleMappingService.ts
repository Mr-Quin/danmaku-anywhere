import { TitleMapping, db } from '../../common/db/db'
import { invariant, isServiceWorker } from '../../common/utils'

export class TitleMappingService {
  private db = db.titleMapping

  constructor() {
    invariant(
      isServiceWorker(),
      'TitleMappingService is only available in service worker'
    )
  }

  async add(mapping: TitleMapping) {
    return this.db.add(mapping)
  }

  async mappingExists(originalTitle: string, source: string) {
    const count = await this.db.where({ originalTitle, source }).count()
    return count > 0
  }

  async getMappedTitle(originalTitle: string, source: string) {
    const mapping = await this.db.get({ originalTitle, source })
    return mapping?.title
  }

  async getMappingsForSource(source: string) {
    return this.db.where({ source }).toArray()
  }
}
