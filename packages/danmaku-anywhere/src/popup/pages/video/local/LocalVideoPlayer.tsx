import type { SelectableEpisode } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useToast } from '@/common/components/Toast/toastStore'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFilterDanmaku } from '@/common/danmaku/queries/useFilterDanmaku'
import { useMatchEpisode } from '@/common/danmaku/queries/useMatchEpisode'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { FileUpload } from '@/popup/component/FileUpload'
import {
  VideoPlayer,
  type VideoPlayerProps,
} from '@/popup/component/videoPlayer/VideoPlayer'
import { DisambiguationSlide } from '@/popup/pages/video/local/DisambiguationSlide'
import { VideoStatus } from '@/popup/pages/video/local/VideoStatus'
import type {
  CommentEntity,
  DanDanPlayOf,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type DanmakuVideoPlayerProps = {
  showFilePicker?: boolean
  matchDanmaku?: boolean
  mediaInfo?: MediaInfo
  loading?: boolean
  statusText?: string
} & Omit<VideoPlayerProps, 'onSelectEpisode'>

export const LocalVideoPlayer = ({
  showFilePicker = false,
  matchDanmaku = false,
  mediaInfo,
  loading,
  statusText,
  ...rest
}: DanmakuVideoPlayerProps) => {
  const { t } = useTranslation()
  const [[file], setFiles] = useState<File[]>([])
  const [comments, setComments] = useState<CommentEntity[]>()
  const [hasDisambiguation, setHasDisambiguation] = useState(false)
  const [disambiguationResults, setDisambiguationResults] = useState<Season[]>(
    []
  )

  const toast = useToast.use.toast()

  const { fileUrl, fileMedia } = useMemo(() => {
    if (!file) {
      return {}
    }

    return {
      fileUrl: URL.createObjectURL(file),
      fileMedia: new MediaInfo(
        file.name.substring(0, file.name.lastIndexOf('.'))
      ),
    }
  }, [file])

  const matchEpisode = useMatchEpisode()
  const fetchMutation = useFetchDanmaku()
  const filterDanmaku = useFilterDanmaku()

  const media = mediaInfo ?? fileMedia

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  useEffect(() => {
    if (!media || !matchDanmaku) return

    toast.info(t('anime.alert.searching', { title: media.seasonTitle }))
    matchEpisode.mutate(
      {
        mapKey: mediaInfo?.getKey(),
        title: media.seasonTitle,
        episodeNumber: mediaInfo?.episode,
      },
      {
        onSuccess: ({ data }) => {
          switch (data.status) {
            case 'success':
              handleFetchDanmaku(data.data)
              break
            case 'disambiguation':
              toast.warn(
                t('anime.alert.searchDisambiguate', {
                  title: media.seasonTitle,
                })
              )
              setDisambiguationResults(data.data)
              setHasDisambiguation(true)
              break
            case 'notFound':
              toast.warn(
                t('anime.alert.searchEmpty', { title: media.seasonTitle })
              )
              break
          }
        },
        onError: (e) => {
          toast.error(
            t('anime.alert.searchError', {
              message: e.message,
            })
          )
        },
      }
    )
  }, [media, matchDanmaku])

  const handleFetchDanmaku = (
    episode: WithSeason<DanDanPlayOf<EpisodeMeta>>
  ) => {
    toast.info(t('danmaku.alert.fetching', { title: episode.title }))
    fetchMutation.mutate(
      {
        meta: episode,
      },
      {
        onSuccess: (data) => {
          setComments(data.comments)
          toast.success(
            t('danmaku.alert.mounted', {
              name: data.title,
              count: data.comments.length,
            })
          )
        },
        onError: (e) => {
          toast.error(
            t('danmaku.alert.fetchError', {
              message: e.message,
            })
          )
        },
      }
    )
  }

  const handleSelect = (episode: SelectableEpisode) => {
    filterDanmaku.mutate(episode, {
      onSuccess: (data) => {
        setComments(data.comments)
      },
    })
  }

  const handleSeasonSelect = (season: Season) => {
    setHasDisambiguation(false)

    matchEpisode.mutate(
      {
        title: season.title,
        seasonId: season.id,
        episodeNumber: mediaInfo?.episode,
        mapKey: mediaInfo?.getKey(),
      },
      {
        onSuccess: (result) => {
          if (result.data.status === 'success') {
            handleFetchDanmaku(result.data.data)
          }
        },
      }
    )
  }

  const handleCloseDisambiguation = () => {
    setHasDisambiguation(false)
  }

  return (
    <VideoPlayer
      videoUrl={fileUrl}
      videoType={file?.type}
      title={fileMedia?.seasonTitle}
      comments={comments}
      onSelectEpisode={handleSelect}
      {...rest}
    >
      {({ size }) => {
        return (
          <>
            {!file && showFilePicker && (
              <FileUpload
                accept=".mp4"
                onFilesSelected={setFiles}
                multiple={false}
                sx={{
                  width: size[0],
                  height: size[1],
                }}
              />
            )}
            <DisambiguationSlide
              hasDisambiguation={hasDisambiguation}
              seasons={disambiguationResults}
              title={fileMedia?.seasonTitle ?? mediaInfo?.seasonTitle ?? ''}
              onApply={handleSeasonSelect}
              onClose={handleCloseDisambiguation}
              isLoading={matchEpisode.isPending || fetchMutation.isPending}
            />
            {(loading || statusText) && (
              <VideoStatus
                width={size[0]}
                height={size[1]}
                message={statusText || ''}
                loading={!!loading}
              />
            )}
          </>
        )
      }}
    </VideoPlayer>
  )
}
