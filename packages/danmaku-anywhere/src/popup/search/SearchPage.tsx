import { Box, Stack } from '@mui/material'
import { AnimeSearch } from './AnimeSearch'
import { useStore } from './store'
import { SearchResultList } from '@/popup/search/SearchResultList'

export const SearchPage = () => {
  const animeSearchResults = useStore((state) => state.animeSearchResults)

  return (
    <Stack direction="column">
      <Stack direction="column" spacing={2}>
        <Box paddingX={2} pt={2}>
          <AnimeSearch />
        </Box>
        {animeSearchResults && (
          <SearchResultList results={animeSearchResults} />
        )}
      </Stack>
    </Stack>
  )
}
