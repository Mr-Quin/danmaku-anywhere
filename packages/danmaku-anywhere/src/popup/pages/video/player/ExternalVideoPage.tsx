import { NothingHere } from '@/common/components/NothingHere'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { LocalVideoPlayer } from '@/popup/pages/video/local/components/LocalVideoPlayer'
import type {
  KazumiChapterResult,
  KazumiSearchResult,
} from '@/popup/pages/video/player/scraper/videoScraper'
import {
  extractVideoUrl,
  getChapters,
} from '@/popup/pages/video/player/scraper/videoScraper'
import { useStore } from '@/popup/store'
import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ExternalVideoPageProps = {
  content: KazumiSearchResult
}

export const ExternalVideoPage = ({ content }: ExternalVideoPageProps) => {
  const { t } = useTranslation()

  const goBack = useGoBack()

  const { kazumiPolicy } = useStore.use.player()

  const [selectedEpisode, setSelectedEpisode] = useState<KazumiChapterResult>()
  const [episodeNumber, setEpisodeNumber] = useState(1)
  const [playList, setPlayList] = useState(0)

  const episodesQuery = useQuery({
    queryKey: kazumiQueryKeys.chapters(content.url, kazumiPolicy?.name ?? ''),
    queryFn: async () => {
      if (!kazumiPolicy) {
        return []
      }
      return getChapters(content.url, kazumiPolicy)
    },
    enabled: !!kazumiPolicy,
    staleTime: Infinity,
    retry: false,
  })

  const videoUrlQuery = useQuery({
    queryKey: kazumiQueryKeys.videoUrl(selectedEpisode?.url ?? ''),
    queryFn: async () => {
      if (!selectedEpisode) return null
      return extractVideoUrl(selectedEpisode.url)
    },
    select: (res) => res?.[0],
    enabled: !!selectedEpisode,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    const playList = episodesQuery.data
    // set default selected chapter
    if (!selectedEpisode && playList?.[0]?.length) {
      setSelectedEpisode(playList[0][0])
    }
  }, [episodesQuery.data])

  if (!kazumiPolicy) {
    goBack()
    return null
  }

  const mediaInfo = useMemo(() => {
    if (selectedEpisode) {
      return new MediaInfo(
        content.name,
        episodeNumber,
        undefined,
        selectedEpisode.name
      )
    }
    return new MediaInfo(content.name, episodeNumber)
  }, [selectedEpisode, episodeNumber, content])

  const hasEpisodes =
    episodesQuery.isSuccess && !!episodesQuery.data?.[0]?.length

  const handleChapterSelect = (index: number, chapter: KazumiChapterResult) => {
    setSelectedEpisode(chapter)
    setEpisodeNumber(index + 1)
  }

  const getStatusText = () => {
    if (episodesQuery.isLoading) {
      return t('videoSearchPage.status.chaptersLoading')
    }
    if (episodesQuery.isSuccess) {
      if (videoUrlQuery.isLoading) {
        return t('videoSearchPage.status.videoLoading')
      }
    }
  }

  const getErrorMessage = () => {
    if (episodesQuery.isError) {
      return `${t('videoSearchPage.status.chaptersError')}: ${episodesQuery.error.message}`
    }
    if (videoUrlQuery.isError) {
      return `${t('videoSearchPage.status.videoError')}: ${videoUrlQuery.error.message}`
    }
  }

  return (
    <TabLayout>
      <TabToolbar
        title={mediaInfo.toString()}
        showBackButton
        onGoBack={goBack}
      />
      <LocalVideoPlayer
        videoUrl={videoUrlQuery.data?.src}
        videoType={videoUrlQuery.data?.type}
        loading={episodesQuery.isLoading || videoUrlQuery.isLoading}
        statusText={getErrorMessage() || getStatusText()}
        title={mediaInfo.toString()}
        matchDanmaku={!!selectedEpisode}
        mediaInfo={mediaInfo}
        renderInfo={() => {
          return (
            <>
              {videoUrlQuery.data?.src && (
                <>
                  <Typography>Video URL</Typography>
                  <Typography>{videoUrlQuery.data?.src}</Typography>
                </>
              )}
              {selectedEpisode?.url && (
                <>
                  <Typography>Page url</Typography>
                  <Typography>{selectedEpisode?.url}</Typography>
                </>
              )}
            </>
          )
        }}
      />

      {episodesQuery.isSuccess && episodesQuery.data.length === 0 && (
        <NothingHere />
      )}

      {hasEpisodes && (
        <>
          <Tabs value={playList} onChange={(_, v) => setPlayList(v)}>
            {episodesQuery.data.map((_, index) => {
              return (
                <Tab
                  key={index}
                  label={t('videoSearchPage.playlist', { index: index + 1 })}
                  value={index}
                ></Tab>
              )
            })}
          </Tabs>
          <Grid container spacing={2}>
            {episodesQuery.data[playList].map((chapter, i) => {
              return (
                <Grid key={i} size={2}>
                  <Card>
                    <CardActionArea
                      onClick={() => handleChapterSelect(i, chapter)}
                      data-active={selectedEpisode === chapter ? '' : undefined}
                      disabled={videoUrlQuery.isLoading}
                      sx={{
                        height: '100%',
                        '&[data-active]': {
                          backgroundColor: 'action.selected',
                          '&:hover': {
                            backgroundColor: 'action.selectedHover',
                          },
                        },
                      }}
                    >
                      <CardContent sx={{ height: '100%' }}>
                        <Typography variant="body1" component="div">
                          {chapter.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          component="div"
                        >
                          {chapter.url}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </>
      )}
    </TabLayout>
  )
}
