import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import type { SearchResult } from '@/common/scraper/videoScraper'
import { searchContent } from '@/common/scraper/videoScraper'
import { useStore } from '@/popup/store'
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
  })

  const handleContentSelect = (content: SearchResult) => {
    navigate(`/player/chapters`, {
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

      {/* Loading and Error */}
      {searchQuery.isFetching && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Results */}
      {!searchQuery.isFetching &&
        searchQuery.data &&
        searchQuery.data.length === 0 && (
          <Typography variant="body1" sx={{ my: 2 }}>
            No results found for "{keyword}". Try a different search term.
          </Typography>
        )}

      {searchQuery.data && searchQuery.data.length > 0 && (
        <List>
          {searchQuery.data.map((result, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton onClick={() => handleContentSelect(result)}>
                <ListItemText
                  primary={result.name}
                  secondary={`Click to view chapters`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}
