import type { IntegrationType } from '@/common/danmaku/enums'

export interface TitleMapping {
  originalTitle: string
  title: string
  /**
   * @deprecated
   * Use source to identify the source of the title mapping, replaced by integration
   */
  source?: string
  integration: IntegrationType
  animeId: number
}
