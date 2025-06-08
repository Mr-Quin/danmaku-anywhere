import { Center } from '@/common/components/Center'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import type { KazumiSearchResult } from '@/popup/pages/video/player/scraper/videoScraper'
import { searchContent } from '@/popup/pages/video/player/scraper/videoScraper'
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
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

export const SearchResultPage = () => {
  const { t } = useTranslation()

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
    <Box>
      {!keyword && (
        <Center>
          <Typography variant="body1">
            {t('videoSearchPage.enterSearchTerm')}
          </Typography>
        </Center>
      )}
      {searchQuery.error && (
        <ErrorMessage message={searchQuery.error.message} />
      )}

      {searchQuery.isLoading && (
        <List>
          {Array.from({ length: 7 }).map((_, index) => (
            <ListItem key={index}>
              <Skeleton height={56} width="100%" />
            </ListItem>
          ))}
        </List>
      )}

      {searchQuery.isSuccess && searchQuery.data.length === 0 && (
        <NothingHere message={t('videoSearchPage.noResults', { keyword })} />
      )}

      {searchQuery.isSuccess && searchQuery.data.length > 0 && (
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
