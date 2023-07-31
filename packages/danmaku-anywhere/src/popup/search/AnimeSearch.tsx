import { Box, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { SearchForm } from './SearchForm'
import { useStore } from './store'
import { useFetchDanmaku } from '@/common/hooks/danmaku/useFetchDanmaku'
import { DanmakuMeta } from '@/common/hooks/danmaku/useLocalDanmaku'
import { useMessageSender } from '@/common/hooks/useMessages'
import { SearchResultList } from '@/popup/search/SearchResultList'

export const AnimeSearch = () => {
  const animeSearchResults = useStore((state) => state.animeSearchResults)

  const [danmakuMeta, setDanmakuMeta] = useState<DanmakuMeta | undefined>()

  const { fetch, isLoading } = useFetchDanmaku()

  useMessageSender(
    {
      action: 'danmaku/start',
      payload: {
        episodeId: danmakuMeta?.episodeId,
      },
    },
    {
      skip: danmakuMeta === undefined,
      tabQuery: { active: true, currentWindow: true },
      dependencies: [danmakuMeta?.episodeId],
    }
  )

  console.log(animeSearchResults, isLoading)

  return (
    <Stack direction="column">
      <Paper elevation={3}>
        <Box padding={2}>
          <Typography variant="body1">
            Title: {danmakuMeta?.animeTitle ?? 'None'}
          </Typography>
          <Typography variant="body2">
            Episode: {danmakuMeta?.episodeTitle ?? 'None'}
          </Typography>
        </Box>
      </Paper>
      <Box>
        <Stack direction="column" spacing={2}>
          <Box paddingX={2} mt={2}>
            <SearchForm />
          </Box>
          {animeSearchResults && (
            <SearchResultList
              results={animeSearchResults}
              loading={isLoading}
              selectedEpisodeId={danmakuMeta?.episodeId}
              onFetch={fetch}
              onSelect={setDanmakuMeta}
            />
          )}
        </Stack>
      </Box>
    </Stack>
  )
}
