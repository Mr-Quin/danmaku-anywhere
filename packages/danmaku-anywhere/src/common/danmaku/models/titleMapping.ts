export interface TitleMapping {
  originalTitle: string
  title: string
  /**
   * @deprecated
   * Use source to identify the source of the title mapping, replaced by integration
   */
  source?: string
  integration: string
  animeId: number
}
