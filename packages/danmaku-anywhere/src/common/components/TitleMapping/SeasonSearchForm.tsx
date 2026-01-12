import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSeasonSearchSuspense } from '@/common/anime/queries/useSeasonSearchSuspense'

type SeasonSearchFormProps = {
  providerConfigId: string
  onSelect: (season: Season) => void
}

export const SeasonSearchForm = ({
  providerConfigId,
  onSelect,
}: SeasonSearchFormProps) => {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [keyword])

  const { data: searchResult, isFetching } = useSeasonSearchSuspense(
    providerConfigId,
    debouncedKeyword
  )

  const seasons = searchResult.data || []

  return (
    <Autocomplete
      options={seasons}
      getOptionLabel={(option) => {
        if ('title' in option) return option.title
        return ''
      }}
      filterOptions={(x) => x}
      loading={isFetching}
      onChange={(_, value) => {
        if (value && 'id' in value) {
          onSelect(value as Season)
        }
      }}
      inputValue={keyword}
      onInputChange={(_, value) => setKeyword(value)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('common.search', 'Search')}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...restProps } = props
        return (
          <li key={key} {...restProps}>
            {option.title}
          </li>
        )
      }}
    />
  )
}
