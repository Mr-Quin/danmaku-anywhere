import { i18n } from '@/common/localization/i18n'

export class MediaInfo {
  constructor(
    public title: string,
    public episode = 1,
    public season?: string,
    public episodeTitle?: string
  ) {}

  private isNumber(value: string) {
    return !isNaN(parseInt(value))
  }

  private formatSeason() {
    if (this.season === undefined) return undefined
    // If season is a number, add an 'S' prefix
    // Otherwise, use the season as is
    if (this.isNumber(this.season))
      return i18n.t('anime.numericSeason', { season: this.season })
    return this.season
  }

  key() {
    if (this.season === undefined) return `${this.title}`

    return `${this.title} ${this.season}`
  }

  toString() {
    const episode = i18n.t('anime.numericEpisode', { episode: this.episode })

    if (this.season === undefined) return `${this.title} ${episode}`

    return `${this.title} ${this.formatSeason()} ${episode}`
  }

  toJSON() {
    return {
      title: this.title,
      episode: this.episode,
      season: this.season,
      episodeTitle: this.episodeTitle,
    }
  }

  equals(other: MediaInfo) {
    return (
      this.title === other.title &&
      this.episode === other.episode &&
      this.season === other.season
    )
  }
}
