import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import type { ChapterResult, SearchResult } from '@/common/scraper/videoScraper'
import { extractVideoUrl, getChapters } from '@/common/scraper/videoScraper'
import { PreFormat } from '@/popup/component/PreFormat'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router'

export const ChaptersPage = () => {
  const location = useLocation()

  const goBack = useGoBack()

  const { kazumiPolicy } = useStore.use.player()

  const [selectedChapter, setSelectedChapter] = useState<ChapterResult | null>(
    null
  )

  // Get the content and policyId from location state
  const content = location.state?.content as SearchResult

  // Fetch chapters
  const chaptersQuery = useQuery({
    queryKey: kazumiQueryKeys.chapters(content.url, kazumiPolicy?.name ?? ''),
    queryFn: async () => {
      if (!kazumiPolicy || !content) {
        return []
      }
      return getChapters(content.url, kazumiPolicy)
    },
  })

  // Fetch video URL
  const videoUrlQuery = useQuery({
    queryKey: kazumiQueryKeys.videoUrl(selectedChapter?.url ?? ''),
    queryFn: async () => {
      console.log(selectedChapter)
      const url = await extractVideoUrl(selectedChapter!.url)
      return url
    },
    enabled: false,
  })

  if (!content || !kazumiPolicy) {
    goBack()
    return null
  }

  // Handle chapter selection
  const handleChapterSelect = (chapter: ChapterResult) => {
    setSelectedChapter(chapter)
    videoUrlQuery.refetch()
    console.log(chapter)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {content.name}
      </Typography>

      {/* Video Player */}
      {videoUrlQuery.data && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {selectedChapter ? selectedChapter.name : 'Video Player'}
          </Typography>
          <PreFormat>{JSON.stringify(videoUrlQuery.data, null, 2)}</PreFormat>
          {/*<DPlayerComponent videoUrl={videoUrl} autoplay />*/}
        </Box>
      )}

      {/* Loading and Error */}
      {(chaptersQuery.isFetching || videoUrlQuery.isFetching) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Chapters */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chapters
          </Typography>

          {chaptersQuery.data && chaptersQuery.data.length > 0 ? (
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {chaptersQuery.data.map((chapterGroup, index) => {
                return (
                  <div key={index}>
                    <div>{index}</div>
                    {chapterGroup.map((chapter, j) => {
                      return (
                        <ListItem key={j} disablePadding>
                          <ListItemButton
                            onClick={() => handleChapterSelect(chapter)}
                            selected={selectedChapter?.url === chapter.url}
                          >
                            <ListItemText primary={chapter.name} />
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </div>
                )
              })}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {chaptersQuery.isFetching
                ? 'Loading chapters...'
                : 'No chapters found'}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
