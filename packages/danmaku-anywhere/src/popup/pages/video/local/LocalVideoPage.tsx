import type { SelectableEpisode } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useToast } from '@/common/components/Toast/toastStore'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFilterDanmaku } from '@/common/danmaku/queries/useFilterDanmaku'
import { useMatchEpisode } from '@/common/danmaku/queries/useMatchEpisode'
import { TabLayout } from '@/content/common/TabLayout'
import { FileUpload } from '@/popup/component/FileUpload'
import { VideoPlayer } from '@/popup/component/videoPlayer/VideoPlayer'
import { DisambiguationSlide } from '@/popup/pages/video/local/DisambiguationSlide'
import type {
  CommentEntity,
  DanDanPlayOf,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const LocalVideoPage = () => {
  const { t } = useTranslation()
  const [[file], setFiles] = useState<File[]>([])
  const [comments, setComments] = useState<CommentEntity[]>()
  const [hasDisambiguation, setHasDisambiguation] = useState(false)
  const [disambiguationResults, setDisambiguationResults] = useState<Season[]>(
    []
  )

  const toast = useToast.use.toast()

  const { fileUrl, fileName } = useMemo(() => {
    if (!file) {
      return {}
    }

    return {
      fileUrl: URL.createObjectURL(file),
      fileName: file.name.substring(0, file.name.lastIndexOf('.')),
    }
  }, [file])

  const matchEpisode = useMatchEpisode()
  const fetchMutation = useFetchDanmaku()
  const filterDanmaku = useFilterDanmaku()

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  useEffect(() => {
    if (!fileName) return
    toast.info(t('anime.alert.searching', { title: fileName }))
    matchEpisode.mutate(
      {
        title: fileName,
      },
      {
        onSuccess: ({ data }) => {
          switch (data.status) {
            case 'success':
              handleFetchDanmaku(data.data)
              break
            case 'disambiguation':
              toast.warn(
                t('anime.alert.searchDisambiguate', { title: fileName })
              )
              setDisambiguationResults(data.data)
              setHasDisambiguation(true)
              break
            case 'notFound':
              toast.warn(t('anime.alert.searchEmpty', { title: fileName }))
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
  }, [fileName])

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

    const episodeMatchPayload = {
      title: season.title,
      seasonId: season.id,
    }

    matchEpisode.mutate(episodeMatchPayload, {
      onSuccess: (result) => {
        if (result.data.status === 'success') {
          handleFetchDanmaku(result.data.data)
        }
      },
    })
  }

  const handleCloseDisambiguation = () => {
    setHasDisambiguation(false)
  }

  return (
    <TabLayout>
      <VideoPlayer
        videoUrl={fileUrl}
        videoType={file?.type}
        title={fileName}
        comments={comments}
        onSelectEpisode={handleSelect}
      >
        {({ size }) => {
          return (
            <>
              {!file && (
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
                title={fileName || ''}
                onApply={handleSeasonSelect}
                onClose={handleCloseDisambiguation}
                isLoading={matchEpisode.isPending || fetchMutation.isPending}
              />
            </>
          )
        }}
      </VideoPlayer>
    </TabLayout>
  )
}
