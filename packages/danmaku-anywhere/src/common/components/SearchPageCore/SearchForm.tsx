import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Search } from '@mui/icons-material'
import type { TextFieldProps } from '@mui/material'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useIsFetching } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { toSimplified } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { SuspenseImage } from '../image/SuspenseImage'
import { images } from '../image/usePreloadImages'
import { ProviderResultsList } from './ProviderResultsList'

interface SearchFormProps {
  onSearch: (searchTerm: string) => void
  searchTerm: string
  onSearchTermChange: (searchTerm: string) => void
  textFieldProps?: TextFieldProps
  onSeasonClick: (
    season: Season | CustomSeason,
    provider: ProviderConfig
  ) => void
}

export const SearchForm = ({
  onSearch,
  onSearchTermChange,
  searchTerm,
  textFieldProps,
  onSeasonClick,
}: SearchFormProps) => {
  const { t } = useTranslation()

  const { data } = useExtensionOptions()

  const isLoading =
    useIsFetching({
      queryKey: seasonQueryKeys.search({ keyword: searchTerm }),
    }) > 0

  const handleKeywordChange = (value: string) => {
    onSearchTermChange(value)
  }

  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchTerm)

  const handleSearch = () => {
    const keyword = data.searchUsingSimplified
      ? toSimplified(searchTerm.trim())
      : searchTerm.trim()

    onSearch(keyword)
    setCommittedSearchTerm(keyword)
    getTrackingService().track('search', { keyword })
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSearch()
      }}
      m={1}
    >
      <Stack direction="column" spacing={1} alignItems="center">
        <TextField
          value={searchTerm}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder={t('searchPage.searchPlaceholder', 'Search title...')}
          fullWidth
          required
          autoFocus
          size="small"
          {...textFieldProps}
          {...withStopPropagation()}
        />
        <Button
          type="submit"
          loading={isLoading}
          variant="contained"
          disabled={!searchTerm}
          size="small"
          autoCapitalize="none"
          fullWidth
        >
          <Search /> {t('searchPage.search', 'Search')}
        </Button>
        {committedSearchTerm ? (
          <ProviderResultsList
            searchTerm={committedSearchTerm}
            onSeasonClick={onSeasonClick}
          />
        ) : (
          <SuspenseImage
            src={images.Fallback}
            sx={{
              position: 'absolute',
              bottom: '0',
              right: '0',
            }}
            height={400}
            cache={false}
          />
        )}
      </Stack>
    </Box>
  )
}
