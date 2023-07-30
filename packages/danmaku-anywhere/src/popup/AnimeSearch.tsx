import {
  DanDanAnime,
  DanDanEpisode,
  searchAnime,
} from '@danmaku-anywhere/danmaku-engine'
import { useId, useState } from 'react'
import { useFetchDanmaku } from '@/common/hooks/danmaku/useFetchDanmaku'
import { DanmakuMeta } from '@/common/hooks/danmaku/useLocalDanmaku'
import { useSessionState } from '@/common/hooks/useSessionState'

export const AnimeSearch = () => {
  const titleInputId = useId()
  const episodeInputId = useId()
  const [title, setTitle] = useSessionState('', 'title')
  const [episodeNumber, setEpisodeNumber] = useSessionState('', 'episode')

  const [results, setResults] = useSessionState<DanDanAnime[]>(
    [],
    'animeSearchResults'
  )
  const [selectedAnime, setSelectedAnime] = useState<DanDanAnime | null>(null)
  const [episode, setEpisode] = useState<DanDanEpisode | null>(null)

  const getMeta = () => {
    const meta = {
      episodeId: episode?.episodeId,
      animeId: selectedAnime?.animeId,
      animeTitle: selectedAnime?.animeTitle,
      episodeTitle: episode?.episodeTitle,
    }

    if (Object.values(meta).some((v) => !v)) return undefined

    return meta as DanmakuMeta
  }

  const { danmaku, fetch } = useFetchDanmaku(getMeta())

  const handleSearch = async () => {
    const result = await searchAnime({
      anime: title,
      episode: episodeNumber,
    })
    console.log(result)
    if (result.success) setResults(result.animes)
  }

  const handleFetchComments = async () => {
    await fetch()
  }

  return (
    <div>
      <div className="card">
        <label htmlFor={titleInputId}>Anime Title</label>
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor={episodeInputId}>Episode</label>
        <input
          id={episodeInputId}
          type="text"
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div>
        {results.map((result) => {
          return (
            <button
              onClick={() => {
                setSelectedAnime(result)
                setEpisode(null)
              }}
              key={result.animeId}
            >
              <div>{result.animeTitle}</div>
            </button>
          )
        })}
      </div>
      {selectedAnime && (
        <div className="card">
          {selectedAnime.animeTitle}
          {selectedAnime.episodes.map((episode) => {
            return (
              <button
                onClick={() => {
                  setEpisode(episode)
                }}
                key={episode.episodeId}
              >
                <div>{episode.episodeTitle}</div>
              </button>
            )
          })}
        </div>
      )}
      {episode && (
        <div className="card">
          Selected episode: {episode.episodeId}
          {danmaku && <div>Existing comments: {danmaku?.count}</div>}
          <button onClick={handleFetchComments}>Fetch Comments</button>
        </div>
      )}
    </div>
  )
}
