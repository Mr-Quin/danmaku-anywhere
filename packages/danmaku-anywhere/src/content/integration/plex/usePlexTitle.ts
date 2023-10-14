import { useToast } from '@/content/store'
import { useEffect, useMemo, useState } from 'react'

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
  /(?<title>[^\s]+)\s*-\s*S(?<season>\d+)\s*·\s*E(?<episode>\d+)/

const parseTitle = (title: string) => {
  const match = titleRegex.exec(title)

  if (!match) throw new Error(`Failed to parse title: ${title}`)

  return {
    title: match.groups!.title,
    season: parseInt(match.groups!.season),
    episode: parseInt(match.groups!.episode),
  }
}

const isEqual = (a: PlexMediaInfo, b: PlexMediaInfo) => {
  return a.title === b.title && a.season === b.season && a.episode === b.episode
}

export const usePlexTitle = () => {
  const [media, setMedia] = useState<PlexMediaInfo>()
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

              if (title) {
                if (media && isEqual(media, title)) continue
                setMedia(title)
                toast.info(`Detected media: ${title.title}`)
              }
            } catch (error: any) {
              toast.error(error.message)
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
    const a = async () => {
      await chrome.runtime.sendMessage({
        action: 'setIcon/active',
      })
    }
    a()
  }, [])

  return media
}
