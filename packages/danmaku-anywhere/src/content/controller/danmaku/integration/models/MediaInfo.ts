import { i18n } from '@/common/localization/i18n'

export interface MediaInfoDto {
  /**
   * The name of the season
   */
  title: string
  /**
   * The numeric episode within the season (1-indexed)
   */
  episode?: number
  /**
   * Any text that decorates the season, for example, S2, 2nd Season, etc.
   */
  seasonDecorator?: string
  /**
   * The title of the episode
   */
  episodeTitle?: string
  /**
   * The original title of the media as it was extracted from the page
   */
  originalTitle?: string
}

export class MediaInfo {
  public title: string
  public episode: number
  public seasonDecorator?: string
  public episodeTitle?: string
  public originalTitle?: string

  constructor(data: MediaInfoDto) {
    this.title = data.title
    this.episode = data.episode ?? 1
    this.seasonDecorator = data.seasonDecorator
    this.episodeTitle = data.episodeTitle
    this.originalTitle = data.originalTitle
  }

  private isNumber(value: string) {
    return !isNaN(Number.parseInt(value))
  }

  private formatSeason() {
    if (this.seasonDecorator === undefined) return undefined
    // If season is a number, add an 'S' prefix
    // Otherwise, use the season as is
    if (this.isNumber(this.seasonDecorator))
      return i18n.t('anime.numericSeason', 'Season {{season}}', {
        season: this.seasonDecorator,
      })
    return this.seasonDecorator
  }

  /**
   * The key is used to map a season to an id in the db.
   * The key only includes the season title (and related information like numeric season number)
   * We assume that the same key represents the same season even on different sites.
   */
  getKey() {
    if (this.seasonDecorator === undefined) return `${this.title.trim()}`

    return `${this.title.trim()}%%${this.seasonDecorator.trim()}`
  }

  toString() {
    const episode = i18n.t('anime.numericEpisode', 'Episode {{episode}}', {
      episode: this.episode,
    })

    if (this.seasonDecorator === undefined) return `${this.title} ${episode}`

    return `${this.title} ${this.formatSeason()} ${episode}`
  }

  equals(other: MediaInfo) {
    return (
      this.title === other.title &&
      this.episode === other.episode &&
      this.seasonDecorator === other.seasonDecorator
    )
  }

  toJSON(): MediaInfoDto {
    return {
      title: this.title,
      episode: this.episode,
      seasonDecorator: this.seasonDecorator,
      episodeTitle: this.episodeTitle,
      originalTitle: this.originalTitle,
    }
  }
}
