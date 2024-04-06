import {
  Autocomplete,
  CircularProgress,
  TextField,
  createFilterOptions,
} from '@mui/material'

import { EpisodeOption } from './EpisodeOption'

import type { DanmakuCacheLite } from '@/common/db/db'
import { episodeIdToEpisodeNumber } from '@/common/utils'
import { useAllDanmakuQuerySuspense } from '@/popup/hooks/useAllDanmakuQuerySuspense'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuCacheLite) =>
    `${option.meta.animeTitle} ${option.meta.episodeTitle}`,
})

const isOptionEqualToValue = (
  option: DanmakuCacheLite,
  value: DanmakuCacheLite
) => {
  return option.meta.episodeId === value?.meta.episodeId
}

export const DanmakuSelector = ({
  value,
  onChange,
}: {
  value: DanmakuCacheLite | null
  onChange: (value: DanmakuCacheLite | null) => void
}) => {
  const { data: options, isFetching } = useAllDanmakuQuerySuspense()

  return (
    <Autocomplete
      value={value} // value must be null when empty so that the component is "controlled"
      loading={isFetching}
      options={options}
      filterOptions={filterOptions}
      isOptionEqualToValue={isOptionEqualToValue}
      onChange={(e, value) => {
        onChange(value ?? null)
      }}
      renderOption={(props, option) => {
        return (
          <EpisodeOption
            {...props}
            key={option.meta.episodeId}
            option={option}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) =>
        option.meta.episodeTitle ??
        `Episode ${episodeIdToEpisodeNumber(option.meta.episodeId)}`
      }
      groupBy={(option) => option.meta.animeTitle}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.meta.animeTitle : 'Select Episode'}
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
        )
      }}
      disablePortal
    />
  )
}
