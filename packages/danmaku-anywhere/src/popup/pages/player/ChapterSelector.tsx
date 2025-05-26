import { NothingHere } from '@/common/components/NothingHere'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { VideoPlayer } from '@/popup/pages/player/VideoPlayer'
import type {
  KazumiChapterResult,
  KazumiSearchResult,
} from '@/popup/pages/player/scraper/videoScraper'
import {
  extractVideoUrl,
  getChapters,
} from '@/popup/pages/player/scraper/videoScraper'
import { useStore } from '@/popup/store'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

export const ChapterSelector = () => {
  const location = useLocation()

  const goBack = useGoBack()

  const { kazumiPolicy } = useStore.use.player()

  const [selectedChapter, setSelectedChapter] = useState<KazumiChapterResult>()
  const [playList, setPlayList] = useState(0)

  const content = location.state?.content as KazumiSearchResult

  const chaptersQuery = useQuery({
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
    queryKey: kazumiQueryKeys.videoUrl(selectedChapter?.url ?? ''),
    queryFn: async () => {
      if (!selectedChapter) return null
      return extractVideoUrl(selectedChapter.url)
    },
    enabled: false,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (selectedChapter) {
      void videoUrlQuery.refetch()
    }
  }, [selectedChapter])

  if (!content || !kazumiPolicy) {
    goBack()
    return null
  }

  const handleChapterSelect = (chapter: KazumiChapterResult) => {
    setSelectedChapter(chapter)
  }

  const getTitle = () => {
    if (selectedChapter) {
      return `${content.name} - ${selectedChapter.name}`
    }
    return content.name
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {getTitle()}
      </Typography>

      <VideoPlayer
        playerProps={{
          videoUrl: videoUrlQuery?.data?.[0],
          autoplay: true,
        }}
        loading={chaptersQuery.isLoading || videoUrlQuery.isLoading}
        error={videoUrlQuery.error?.message}
        title={getTitle()}
        pageUrl={selectedChapter?.url}
      />

      {chaptersQuery.data && chaptersQuery.data.length === 0 && <NothingHere />}
      {chaptersQuery.data && chaptersQuery.data.length > 0 && (
        <>
          <Tabs value={playList} onChange={(_, v) => setPlayList(v)}>
            {chaptersQuery.data.map((_, index) => {
              return (
                <Tab
                  key={index}
                  label={`List ${index + 1}`}
                  value={index}
                ></Tab>
              )
            })}
          </Tabs>
          <Grid container spacing={2}>
            {chaptersQuery.data[playList].map((chapter, i) => {
              return (
                <Grid key={i} size={2}>
                  <Card>
                    <CardActionArea
                      onClick={() => handleChapterSelect(chapter)}
                      data-active={selectedChapter === chapter ? '' : undefined}
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
                        <Typography variant="caption" color="text.secondary">
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
    </Box>
  )
}
