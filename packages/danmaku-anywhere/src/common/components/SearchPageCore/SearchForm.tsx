import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Close, Search } from '@mui/icons-material'
import type { TextFieldProps } from '@mui/material'
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
} from '@mui/material'
import { useIsFetching } from '@tanstack/react-query'
import { type SyntheticEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchMascot } from '@/common/components/SearchPageCore/SearchMascot'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useSearchHistory } from '@/common/options/searchHistory/useSearchHistory'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { matchWithPinyin, toSimplified } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
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

export function SearchForm({
  onSearch,
  onSearchTermChange,
  searchTerm,
  textFieldProps,
  onSeasonClick,
}: SearchFormProps) {
  const { t } = useTranslation()

  const { data } = useExtensionOptions()
  const { entries, addEntry, removeEntry } = useSearchHistory()

  const isLoading =
    useIsFetching({
      queryKey: seasonQueryKeys.search({ keyword: searchTerm }),
    }) > 0

  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchTerm)

  const handleSearch = (keyword?: string) => {
    const raw = keyword ?? searchTerm
    const trimmed = raw.trim()
    const processed = data.searchUsingSimplified
      ? toSimplified(trimmed)
      : trimmed

    if (!processed) {
      return
    }

    onSearch(processed)
    setCommittedSearchTerm(processed)
    void addEntry(trimmed)
    getTrackingService().track('search', { keyword: processed })
  }

  const handleAutocompleteChange = (
    _event: SyntheticEvent,
    value: string | null
  ) => {
    if (value !== null) {
      onSearchTermChange(value)
      handleSearch(value)
    }
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
        <Autocomplete
          freeSolo
          options={entries}
          inputValue={searchTerm}
          onInputChange={(_event, value, reason) => {
            if (reason !== 'reset') {
              onSearchTermChange(value)
            }
          }}
          onChange={handleAutocompleteChange}
          filterOptions={(options, state) => {
            if (!state.inputValue) {
              return options
            }
            return options.filter((option) => {
              return matchWithPinyin(option, state.inputValue)
            })
          }}
          renderOption={(props, option) => {
            return (
              <li {...props} key={option}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {option}
                  </Box>
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label={t('common.delete')}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      void removeEntry(option)
                    }}
                    sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              </li>
            )
          }}
          fullWidth
          renderInput={(params) => {
            return (
              <TextField
                {...params}
                placeholder={t(
                  'searchPage.searchPlaceholder',
                  'Search title...'
                )}
                required
                autoFocus
                size="small"
                autoComplete="off"
                {...textFieldProps}
                {...withStopPropagation()}
              />
            )
          }}
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
          <SearchMascot />
        )}
      </Stack>
    </Box>
  )
}
