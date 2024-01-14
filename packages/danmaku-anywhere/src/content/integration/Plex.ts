import { MediaObserver, MediaState } from './MediaObserver'

// title format
// ▶ [TITLE] - S[SEASON] · E[EPISODE]
// [TITLE] - S[SEASON] · E[EPISODE]
// ▶ [TITLE]
// [TITLE]
const titleRegex =
  /(?<playing>▶\s)?(?<title>.+)\s-\s*S(?<season>\d+)\s*·\s*E(?<episode>\d+)/

const parseTitle = (title: string) => {
  const match = titleRegex.exec(title)

  if (!match) return null

  return {
    playing: !!match.groups?.playing,
    title: match.groups!.title,
    season: parseInt(match.groups!.season),
    episode: parseInt(match.groups!.episode),
  }
}

export class PlexObserver extends MediaObserver {
  static observerName = 'plex'

  private titleObserver?: MutationObserver
  private title?: string
  private season?: number
  private episode?: number
  private playing?: boolean

  constructor() {
    super()
  }

  setup() {
    // assume title element is always present
    const titleElt = document.querySelector('title')!

    this.titleObserver = new MutationObserver(this.handleTitleChange.bind(this))

    this.titleObserver.observe(titleElt, { childList: true })

    const title = titleElt?.textContent

    if (!title) return

    const titleData = parseTitle(title)

    if (!titleData) return

    const mediaState = new MediaState(
      titleData.title,
      titleData.episode,
      titleData.season
    )

    this.updateState(titleData.playing, mediaState)
  }

  private updateState(isPlaying: boolean, state: MediaState) {
    if (this.title !== state.title) this.emit('titleChange', state.title)
    if (this.season !== state.season) this.emit('seasonChange', state.season!)
    if (this.episode !== state.episode)
      this.emit('episodeChange', state.episode)
    if (
      this.title !== state.title ||
      this.season !== state.season ||
      this.episode !== state.episode
    ) {
      this.emit('mediaChange', state)
    }

    if (isPlaying !== this.playing) {
      if (isPlaying) {
        this.emit('statusChange', 'playing')
      } else {
        this.emit('statusChange', 'paused')
      }
    }
    this.title = state.title
    this.season = state.season
    this.episode = state.episode
    this.playing = isPlaying
  }

  private handleTitleChange(mutationList: MutationRecord[]) {
    for (const mutation of mutationList) {
      if (mutation.type === 'childList') {
        const newTitle = mutation.target.textContent

        if (!newTitle) continue

        const titleData = parseTitle(newTitle)

        if (!titleData) {
          if (this.title) {
            this.emit('statusChange', 'stopped')
          }
          continue
        }

        const mediaState = new MediaState(
          titleData.title,
          titleData.episode,
          titleData.season
        )

        this.updateState(titleData.playing, mediaState)
      }
    }
  }

  destroy() {
    super.destroy()
    this.titleObserver?.disconnect()
    this.titleObserver = undefined
  }
}
