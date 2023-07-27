import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useState } from 'preact/hooks'
import styles from './panel.module.scss'
import { PopupPanelWrapper } from './PopupPanelWrapper'
import { SectionHeader } from './SectionHeader'
import { logger } from '@/utils/logger'
import { useMedia, useStore } from '@/store/store'

const getIcon = (type: DanDanAnime['type']) => {
  switch (type) {
    case 'jpdrama':
      return '🎭'
    case 'tvseries':
      return '📺'
    case 'movie':
      return '🎬'
    case 'ova':
      return '📼'
    case 'web':
      return '🌐'
    case 'musicvideo':
      return '🎵'
    default:
      return '❓'
  }
}

const SeriesChip = ({ media }: { media: DanDanAnime }) => {
  const { meta } = useMedia()
  const updateMedia = useStore.use.updateMedia()
  const setTitleMap = useStore.use.setTitleMap()

  const handleClick = () => {
    updateMedia({
      selected: media,
      // also update the selected anime so that the dropdown has a selected value
      episode: media.episodes[0] ?? null,
    })
    if (meta.key) {
      logger.log(`Mapped title ${meta.key} -> ${media.animeTitle}`)
      setTitleMap(meta.key, media.animeTitle)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={styles.seriesSelectionChip}
      title={`${media.typeDescription} - ${media.animeTitle}`}
    >
      <div>{getIcon(media.type)}</div>
      <div>{media.animeTitle}</div>
    </button>
  )
}

const SeriesSelection = () => {
  const { results } = useMedia()

  return (
    <div className={styles.seriesSelection}>
      {results.map((result) => (
        <SeriesChip media={result} key={result.animeId} />
      ))}
    </div>
  )
}

const TitleSelection = () => {
  const { selected: selectedAnime, meta } = useMedia()
  const [title, setTitle] = useState(meta.title ?? '')

  const fetchMediaInfo = useStore.use.fetchMediaInfo()

  useEffect(() => {
    if (selectedAnime) {
      setTitle(selectedAnime.animeTitle)
    }
  }, [selectedAnime])

  const handleSearch = async () => {
    await fetchMediaInfo(title)
  }

  return (
    <div className={styles.titleSelection}>
      <input
        className={styles.titleSelectionInput}
        type="text"
        value={title}
        onChange={(e) => {
          if (e?.target instanceof HTMLInputElement) {
            setTitle(e.target.value)
          }
        }}
      />
      <button className={styles.baseButton} onClick={handleSearch}>
        Search
      </button>
    </div>
  )
}

const EpisodeSelection = () => {
  const { selected: selectedAnime, episode: selectedEpisode } = useMedia()

  const updateMedia = useStore.use.updateMedia()

  return (
    <div>
      <select
        className={styles.episodeSelection}
        value={selectedEpisode?.episodeTitle}
        onChange={(e) => {
          if (e?.target instanceof HTMLSelectElement) {
            const value = e.target.value
            updateMedia({
              episode:
                selectedAnime?.episodes.find(
                  (episode) => episode.episodeTitle === value
                ) ?? null,
            })
          }
        }}
      >
        {selectedAnime?.episodes.map((episode) => (
          <option
            className={styles.episodeSelectionOptions}
            key={episode.episodeId}
          >
            {episode.episodeTitle}
          </option>
        ))}
      </select>
    </div>
  )
}

interface DanmakuMenuProps {
  getDanmakuContainer: () => {
    container: HTMLDivElement | null
    media: HTMLMediaElement | null
  }
}

export const DanmakuMenu = ({ getDanmakuContainer }: DanmakuMenuProps) => {
  const createDanmaku = useStore.use.createDanmaku()
  const fetchComments = useStore.use.fetchComments()
  const { episode } = useMedia()

  const handleGetComments = async () => {
    if (!episode) return

    const { container, media } = getDanmakuContainer()

    if (!container || !media) {
      logger.error('Failed to find video element to mount danmaku')
      return
    }

    await fetchComments(
      episode.episodeId,
      {
        withRelated: true,
      },
      false
    )

    createDanmaku(container, media)
  }

  const disabled = episode === null

  return (
    <PopupPanelWrapper>
      <SectionHeader>Title</SectionHeader>
      <TitleSelection />
      <SeriesSelection />
      <SectionHeader>Episode</SectionHeader>
      <EpisodeSelection />
      <div>
        <button
          className={`${styles.baseButton} ${disabled ? styles.disabled : ''}`}
          onClick={handleGetComments}
          disabled={disabled}
        >
          Fetch comments
        </button>
      </div>
    </PopupPanelWrapper>
  )
}
