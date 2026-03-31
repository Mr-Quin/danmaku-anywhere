import { inject, injectable } from 'inversify'
import { DanmakuAnywhereDb } from '@/common/db/db'

@injectable()
export class DataManagementService {
  constructor(@inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb) {}

  async wipeAllData({
    includeCustomEpisodes,
  }: {
    includeCustomEpisodes: boolean
  }): Promise<void> {
    const tables = [
      this.db.episode,
      this.db.season,
      this.db.seasonMap,
      this.db.customEpisode,
      this.db.bookmark,
    ]
    await this.db.transaction('rw', tables, async () => {
      await this.db.episode.clear()
      await this.db.season.clear()
      await this.db.seasonMap.clear()
      await this.db.bookmark.clear()

      if (includeCustomEpisodes) {
        await this.db.customEpisode.clear()
      }
    })
  }
}
