import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Search } from '@mui/icons-material'
import type { TextFieldProps } from '@mui/material'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { toSimplified } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { ProviderResultsList } from './ProviderResultsList'

interface SearchFormProps {
  onSearch: (searchTerm: string) => void
  isLoading: boolean
  useSimplified: boolean
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
  isLoading,
  useSimplified,
  onSearchTermChange,
  searchTerm,
  textFieldProps,
  onSeasonClick,
}: SearchFormProps) => {
  const { t } = useTranslation()

  const handleKeywordChange = (value: string) => {
    onSearchTermChange(value)
  }

  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchTerm)

  const handleSearch = () => {
    const keyword = useSimplified
      ? toSimplified(searchTerm.trim())
      : searchTerm.trim()

    onSearch(keyword)
    setCommittedSearchTerm(keyword)
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
        {committedSearchTerm && (
          <ProviderResultsList
            searchTerm={committedSearchTerm}
            onSeasonClick={onSeasonClick}
          />
        )}
      </Stack>
    </Box>
  )
}
