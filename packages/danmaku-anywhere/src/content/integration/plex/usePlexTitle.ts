import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/content/store'

export interface PlexMediaInfo {
  title: string
  season: number
  episode: number
}

// title format
// ▶ [TITLE] - S[SEASON] · E[EPISODE]
// [TITLE] - S[SEASON] · E[EPISODE]
// ▶ [TITLE]
// [TITLE]
const titleRegex =
  /(?<playing>▶\s)?(?<title>.+)\s-\s*S(?<season>\d+)\s*·\s*E(?<episode>\d+)/

const parseTitle = (title: string) => {
  const match = titleRegex.exec(title)

  if (!match) throw new Error(`Failed to parse title: ${title}`)

  return {
    playing: !!match.groups?.playing,
    title: match.groups!.title,
    season: parseInt(match.groups!.season),
    episode: parseInt(match.groups!.episode),
  }
}

export const usePlexTitle = () => {
  const [title, setTitle] = useState<string>()
  const [season, setSeason] = useState<number>()
  const [episode, setEpisode] = useState<number>()
  const [playing, setPlaying] = useState<boolean>(false)

  const { toast } = useToast()

  const titleElt = document.querySelector('title')

  // observe title change to detect media change
  // and parse the currently playing media
  const titleObserver = useMemo(
    () =>
      new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            const newTitle = mutation.target.textContent

            if (!newTitle) continue

            try {
              const title = parseTitle(newTitle)

              setTitle(title.title)
              setSeason(title.season)
              setEpisode(title.episode)
              setPlaying(title.playing)
            } catch (error: any) {
              setTitle(undefined)
              setSeason(undefined)
              setEpisode(undefined)
              setPlaying(false)
              // toast.error(error.message)
            }
          }
        }
      }),
    []
  )

  useEffect(() => {
    if (!titleElt) return

    titleObserver.observe(titleElt, { childList: true })

    return () => {
      titleObserver.disconnect()
    }
  }, [titleElt])

  useEffect(() => {
    if (!title) {
      toast.info('No media detected')
      return
    }
    if (playing) {
      toast.info(`Playing: ${title} S${season} · E${episode}`)
    } else {
      toast.info(`Paused: ${title} S${season} · E${episode}`)
    }
  }, [playing, title, season, episode])
}
