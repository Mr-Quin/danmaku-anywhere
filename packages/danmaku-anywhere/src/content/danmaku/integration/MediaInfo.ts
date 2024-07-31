export class MediaInfo {
  constructor(
    public title: string,
    public episode = 1,
    public season?: number,
    public episodic?: boolean
  ) {}

  toTitleString() {
    if (this.season === undefined) return `${this.title}`
    return `${this.title} S${this.season}`
  }

  toString() {
    if (!this.episodic) return `${this.title}`
    if (this.season === undefined) return `${this.title} E${this.episode}`
    return `${this.title} S${this.season}E${this.episode}`
  }
}
