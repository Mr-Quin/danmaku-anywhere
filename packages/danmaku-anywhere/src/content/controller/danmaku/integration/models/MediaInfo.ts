import { i18n } from '@/common/localization/i18n'

export class MediaInfo {
  constructor(
    /**
     * The name of the season
     */
    public seasonTitle: string,
    /**
     * The numeric episode within the season (1-indexed)
     */
    public episode = 1,
    /**
     * Any text that decorates the season, for example, S2, 2nd Season, etc.
     */
    public seasonDecorator?: string,
    /**
     * The title of the episode
     */
    public episodeTitle?: string,
  ) {
  }

  private isNumber(value: string) {
    return !isNaN(parseInt(value))
  }

  private formatSeason() {
    if (this.seasonDecorator === undefined) return undefined
    // If season is a number, add an 'S' prefix
    // Otherwise, use the season as is
    if (this.isNumber(this.seasonDecorator))
      return i18n.t('anime.numericSeason', { season: this.seasonDecorator })
    return this.seasonDecorator
  }

  fullSeason() {
    if (this.seasonDecorator === undefined) return `${this.seasonTitle.trim()}`

    return `${this.seasonTitle.trim()}%%${this.seasonDecorator.trim()}`
  }

  toString() {
    const episode = i18n.t('anime.numericEpisode', { episode: this.episode })

    if (this.seasonDecorator === undefined) return `${this.seasonTitle} ${episode}`

    return `${this.seasonTitle} ${this.formatSeason()} ${episode}`
  }

  equals(other: MediaInfo) {
    return (
      this.seasonTitle === other.seasonTitle &&
      this.episode === other.episode &&
      this.seasonDecorator === other.seasonDecorator
    )
  }
}
