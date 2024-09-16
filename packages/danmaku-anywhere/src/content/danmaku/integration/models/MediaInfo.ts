export class MediaInfo {
  constructor(
    public title: string,
    public episode = 1,
    public season?: number,
    public episodic?: boolean,
    public episodeTitle?: string
  ) {}

  key() {
    if (this.season === undefined) return `${this.title}`
    return `${this.title} S${this.season}`
  }

  toString() {
    if (!this.episodic) return `${this.title}`
    if (this.season === undefined) return `${this.title} E${this.episode}`
    return `${this.title} S${this.season}E${this.episode}`
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
