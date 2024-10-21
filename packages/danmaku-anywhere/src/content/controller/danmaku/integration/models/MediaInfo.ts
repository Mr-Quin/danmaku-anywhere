export class MediaInfo {
  constructor(
    public title: string,
    public episode = 1,
    public season?: string,
    public episodic?: boolean,
    public episodeTitle?: string
  ) {}

  private isNumber(value: string) {
    return !isNaN(parseInt(value))
  }

  private formatSeason() {
    if (this.season === undefined) return undefined
    // If season is a number, add an 'S' prefix
    // Otherwise, use the season as is
    if (this.isNumber(this.season)) return `S${this.season}`
    return this.season
  }

  key() {
    if (this.season === undefined) return `${this.title}`

    return `${this.title} ${this.formatSeason()}`
  }

  toString() {
    if (!this.episodic) return `${this.title}`
    if (this.season === undefined) return `${this.title} E${this.episode}`
    return `${this.title} ${this.formatSeason()} E${this.episode}`
  }

  toJSON() {
    return {
      title: this.title,
      episode: this.episode,
      season: this.season,
      episodic: this.episodic,
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
