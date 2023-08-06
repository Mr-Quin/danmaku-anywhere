import { Box, Stack } from '@mui/material'
import { useState } from 'react'
import { SearchForm } from './SearchForm'
import { useStore } from './store'
import { SearchResultList } from '@/popup/search/SearchResultList'
import { useFetchDanmaku } from '@/common/hooks/danmaku/useFetchDanmaku'
import { DanmakuMeta } from '@/common/hooks/danmaku/useDanmakuDb'

export const AnimeSearch = () => {
  const animeSearchResults = useStore((state) => state.animeSearchResults)

  const [danmakuMeta, setDanmakuMeta] = useState<DanmakuMeta | undefined>()

  const { fetch, isLoading } = useFetchDanmaku()

  return (
    <Stack direction="column">
      <Stack direction="column" spacing={2}>
        <Box paddingX={2} mt={2}>
          <SearchForm />
        </Box>
        <SearchResultList
          results={animeSearchResults}
          loading={isLoading}
          selectedEpisodeId={danmakuMeta?.episodeId}
          onFetch={fetch}
          onSelect={setDanmakuMeta}
        />
      </Stack>
    </Stack>
  )
}
