import { Box, Collapse, Stack } from '@mui/material'
import { useStore } from '../store'
import { AnimeSearch } from './AnimeSearch'
import { EpisodeListItem } from './EpisodeListItem'
import { SearchResultList } from '@/common/components/animeList/SearchResultList'

export const SearchPage = () => {
  const animeSearchResults = useStore((state) => state.animeSearchResults)

  const hasResults = !!animeSearchResults && animeSearchResults.length > 0

  return (
    <Stack direction="column" spacing={2}>
      <Box paddingX={2} pt={2}>
        <AnimeSearch />
      </Box>
      <Collapse in={hasResults}>
        <SearchResultList
          dense
          results={animeSearchResults ?? []}
          renderEpisodes={(episodes, result) => {
            return episodes.map((episode) => (
              <EpisodeListItem
                episodeId={episode.episodeId}
                episodeTitle={episode.episodeTitle}
                animeId={result.animeId}
                animeTitle={result.animeTitle}
                key={episode.episodeId}
              />
            ))
          }}
        />
      </Collapse>
    </Stack>
  )
}
