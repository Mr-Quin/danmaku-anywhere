import { StateCreator } from 'zustand'
import type { State } from './store'
import { DanDanEpisode, DanDanMedia, searchAPI } from '@/dandanplay/api'

interface MediaInfo {
  meta: {
    // this key is used for mapping title
    key: string | null
    // used for ui
    title: string
  }
  results: DanDanMedia[]
  error: string | null
  selected: DanDanMedia | null
  episode: DanDanEpisode | null
}

export interface MediaSlice {
  isMediaActive: boolean
  media: MediaInfo
  setIsMediaActive: (isPlaying: boolean) => void
  updateMedia: (media: Partial<MediaInfo>) => void
  setTitle: (title: string) => void
  fetchMediaInfo: (title: string) => Promise<DanDanMedia[]>
  // reset media info except meta
  resetMedia: () => void
  setTitleMap: (key: string, value: string) => void
  getTitleMap: (key: string) => string | null
}

const defaultMedia: MediaInfo = {
  meta: {
    key: null,
    title: '',
  },
  results: [],
  error: null,
  selected: null,
  episode: null,
}

Object.freeze(defaultMedia)

const TITLE_MAP_KEY = 'danmaku-media-cache'

const loadTitleMap = () => {
  const existing = localStorage.getItem(TITLE_MAP_KEY)
  return JSON.parse(existing || '{}') as Record<string, string>
}

const getTitleMap = (title: string): string | null => {
  const existing = loadTitleMap()
  return existing[title] ?? null
}

const setTitleMap = (key: string, value: string) => {
  const existing = loadTitleMap()
  localStorage.setItem(
    TITLE_MAP_KEY,
    JSON.stringify({
      ...existing,
      [key]: value,
    })
  )
}

export const createMediaSlice: StateCreator<State, [], [], MediaSlice> = (
  set,
  get
) => ({
  isMediaActive: false,
  media: { ...defaultMedia },
  setIsMediaActive: (isPlaying) => set({ isMediaActive: isPlaying }),
  updateMedia: (media) => {
    set((state) => ({
      media: {
        ...state.media,
        ...media,
      },
    }))
  },
  fetchMediaInfo: async (title) => {
    const { animes, errorMessage, success } = await searchAPI({
      anime: title,
    })

    if (!success) {
      get().updateMedia({
        error: errorMessage,
      })
      return []
    }

    get().resetMedia()

    if (animes.length === 0) {
      get().updateMedia({
        results: [],
        error: `No result found for title ${title}`,
      })
    } else {
      // TODO: use `toSorted` once https://github.com/microsoft/TypeScript/pull/51367 is merged
      // sort so that the first season is at the top
      get().updateMedia({
        results: animes.sort((a, b) => {
          return a.animeId - b.animeId
        }),
        error: null,
      })
    }

    return animes
  },
  setTitle: (title) => {
    get().updateMedia({
      meta: {
        ...get().media.meta,
        title,
      },
    })
  },
  resetMedia: () => {
    set((state) => ({
      media: {
        ...defaultMedia,
        meta: state.media.meta,
      },
    }))
  },
  setTitleMap: (key, value) => {
    setTitleMap(key, value)
  },
  getTitleMap: (key) => getTitleMap(key),
})
