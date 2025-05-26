import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import type { KazumiSearchResult } from '@/popup/pages/player/scraper/videoScraper'
import { searchContent } from '@/popup/pages/player/scraper/videoScraper'
import { useStore } from '@/popup/store'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

export const VideoSearchResults = () => {
  const navigate = useNavigate()

  const { keyword, kazumiPolicy } = useStore.use.player()

  const searchQuery = useQuery({
    queryKey: kazumiQueryKeys.search(keyword, kazumiPolicy?.name ?? ''),
    queryFn: async () => {
      if (!kazumiPolicy || !keyword) {
        return []
      }
      return searchContent(keyword, kazumiPolicy)
    },
    enabled: !!kazumiPolicy && !!keyword,
    staleTime: Infinity,
    retry: false,
  })

  const handleContentSelect = (content: KazumiSearchResult) => {
    navigate(`chapters`, {
      state: {
        content,
      },
    })
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Search Results for "{keyword}"
      </Typography>

      {searchQuery.error && (
        <ErrorMessage message={searchQuery.error.message} />
      )}

      {searchQuery.isLoading && (
        <List>
          {Array.from({ length: 5 }).map((_, index) => (
            <ListItem key={index} disablePadding>
              <ListItemText
                primary={
                  <Skeleton
                    variant="text"
                    width={Math.max(0.5, Math.random()) * 800}
                  />
                }
                secondary={
                  <Skeleton
                    variant="text"
                    width={Math.max(0.5, Math.random()) * 800}
                  />
                }
              ></ListItemText>
            </ListItem>
          ))}
        </List>
      )}

      {searchQuery.data && searchQuery.data.length === 0 && (
        <NothingHere message={`No results found for "${keyword}"`} />
      )}

      {searchQuery.data && searchQuery.data.length > 0 && (
        <List>
          {searchQuery.data.map((result, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton onClick={() => handleContentSelect(result)}>
                <ListItemText primary={result.name} secondary={result.url} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}
