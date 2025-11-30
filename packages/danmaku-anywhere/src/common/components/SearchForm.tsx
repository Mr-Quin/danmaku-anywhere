import { Search } from '@mui/icons-material'
import type { TextFieldProps } from '@mui/material'
import {
  Box,
  Button,
  FormControlLabel,
  FormHelperText,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { toSimplified } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

interface SearchFormProps {
  onSearch: (searchTerm: string) => void
  isLoading: boolean
  useSimplified: boolean
  onSimplifiedChange: (on: boolean, searchTerm: string) => void
  searchTerm: string
  onSearchTermChange: (searchTerm: string) => void
  textFieldProps?: TextFieldProps
}

export const SearchForm = ({
  onSearch,
  isLoading,
  useSimplified,
  onSimplifiedChange,
  onSearchTermChange,
  searchTerm,
  textFieldProps,
}: SearchFormProps) => {
  const { t } = useTranslation()

  const handleKeywordChange = (value: string) => {
    onSearchTermChange(value)
  }

  const handleToggleSimplified = (on: boolean) => {
    onSimplifiedChange(on, on ? toSimplified(searchTerm) : searchTerm)
  }

  const handleSearch = () => {
    const keyword = useSimplified
      ? toSimplified(searchTerm.trim())
      : searchTerm.trim()

    onSearch(keyword)
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSearch()
      }}
    >
      <Stack direction="row" spacing={1} alignItems="start">
        <TextField
          label={t('searchPage.title', 'Title')}
          value={searchTerm}
          onChange={(e) => handleKeywordChange(e.target.value)}
          fullWidth
          required
          autoFocus
          {...textFieldProps}
          {...withStopPropagation()}
        />
        <Button
          type="submit"
          loading={isLoading}
          variant="contained"
          disabled={!searchTerm}
        >
          <Search />
        </Button>
      </Stack>
      <FormControlLabel
        control={
          <Switch
            checked={useSimplified}
            onChange={(e) => {
              handleToggleSimplified(e.target.checked)
            }}
          />
        }
        label={t(
          'optionsPage.searchUsingSimplified',
          'Search using simplified Chinese'
        )}
      />
      {useSimplified && searchTerm && (
        <FormHelperText>
          {t('searchPage.convertedTitle', 'Converted Title')}:{' '}
          {toSimplified(searchTerm)}
        </FormHelperText>
      )}
    </Box>
  )
}
