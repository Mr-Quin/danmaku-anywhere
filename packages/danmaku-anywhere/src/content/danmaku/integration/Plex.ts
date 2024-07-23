import type { PlaybackStatus } from './MediaObserver'
import { MediaInfo, MediaObserver } from './MediaObserver'

// title format
// episodic:
// ▶ [TITLE] - S[SEASON] · E[EPISODE]
// ▶ [TITLE] - 第[SEASON]季 · 第[EPISODE]集
// ▶ [TITLE] - 第[SEASON]季 · E[EPISODE]
// ▶ [TITLE] - シーズン[SEASON] · 第[EPISODE]話
// generally the season and episode number have the following format:
// - *[SEASON]* · *[EPISODE]*
// where * is any number of non-digit character
// non-episodic (movie, music, etc.):
// ▶ [TITLE]
const titleRegex = {
  episodic:
    /(?<playing>▶\s)?(?<title>.+)(\s-\s*[^\d]*(?<season>\d+)[^\d]*\s·\s[^\d]*(?<episode>\d+)[^\d]*$)/,
  other: /(?<playing>▶\s)?(?<title>.+)/,
}

const parseTitle = (title: string) => {
  if (title.toLocaleLowerCase() === 'plex') return

  const episodicMatch = title.match(titleRegex.episodic)

  if (episodicMatch?.groups?.season !== undefined) {
    return {
      playing: !!episodicMatch.groups?.playing,
      mediaInfo: new MediaInfo(
        episodicMatch.groups!.title,
        parseInt(episodicMatch.groups!.episode),
        parseInt(episodicMatch.groups!.season),
        true
      ),
    }
  }

  const match = title.match(titleRegex.other)

  if (match) {
    return {
      playing: !!match.groups?.playing,
      mediaInfo: new MediaInfo(
        match.groups!.title,
        undefined,
        undefined,
        false
      ),
    }
  }
}

export class PlexObserver extends MediaObserver {
  static observerName = 'plex'

  private titleObserver?: MutationObserver
  private title?: string
  private season?: number
  private episode?: number
  private playing: PlaybackStatus = 'stopped'

  setup() {
    const titleElt = document.querySelector('title')!
    this.titleObserver = new MutationObserver(this.handleTitleChange.bind(this))
    this.titleObserver.observe(titleElt, { childList: true })

    const title = titleElt.textContent
    if (!title) return

    const titleData = parseTitle(title)
    if (!titleData) return

    // Since we matched the title, we know the video must be either playing or paused
    this.updateState(
      titleData.playing ? 'playing' : 'paused',
      titleData.mediaInfo
    )
  }

  private updateState(isPlaying: PlaybackStatus, info: MediaInfo) {
    const titleChanged = this.title !== info.title
    const seasonChanged = this.season !== info.season
    const episodeChanged = this.episode !== info.episode
    const statusChanged = isPlaying !== this.playing

    if (titleChanged) this.emit('titleChange', info.title)
    if (seasonChanged && info.season !== undefined)
      this.emit('seasonChange', info.season)
    if (episodeChanged) this.emit('episodeChange', info.episode)
    if (titleChanged || seasonChanged || episodeChanged) {
      this.emit('mediaChange', info)
    }

    if (statusChanged) {
      this.emit('statusChange', isPlaying)
    }

    this.title = info.title
    this.season = info.season
    this.episode = info.episode
    this.playing = isPlaying
  }

  private handleTitleChange(mutationList: MutationRecord[]) {
    for (const mutation of mutationList) {
      if (mutation.type === 'childList') {
        const newTitle = mutation.target.textContent
        if (!newTitle) continue

        const titleData = parseTitle(newTitle)

        // if there's no title data, and we have a title, it means the video has ended
        if (!titleData) {
          if (this.title) {
            this.emit('statusChange', 'stopped')
            this.playing = 'stopped'
            this.title = undefined
          }
          continue
        }

        this.updateState(
          titleData.playing ? 'playing' : 'paused',
          titleData.mediaInfo
        )
      }
    }
  }

  destroy() {
    super.destroy()
    this.titleObserver?.disconnect()
  }
}
