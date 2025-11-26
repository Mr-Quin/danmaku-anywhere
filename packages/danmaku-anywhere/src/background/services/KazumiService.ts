import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import {
  type KazumiChapterResult,
  type KazumiSearchResult,
  kazumiGetChapters,
  kazumiSearch,
} from '@danmaku-anywhere/web-scraper'
import { injectable } from 'inversify'

@injectable('Singleton')
export class KazumiService {
  async searchContent(
    keyword: string,
    policy: KazumiPolicy
  ): Promise<KazumiSearchResult[]> {
    return kazumiSearch(keyword, policy)
  }

  async getChapters(
    contentUrl: string,
    policy: KazumiPolicy
  ): Promise<KazumiChapterResult[][]> {
    return kazumiGetChapters(contentUrl, policy)
  }
}
