import { Autocomplete, CircularProgress, TextField } from '@mui/material'

import {
  filterOptions,
  isOptionEqualToValue,
  EpisodeOption,
} from './MountController'

import type { DanmakuCache } from '@/common/db/db'
import { episodeIdToEpisodeNumber } from '@/common/utils'
import { useAllDanmakuQuery } from '@/popup/hooks/useAllDanmakuQuery'

export const MountControllerAutoComplete = ({
  value,
  onChange,
}: {
  value: DanmakuCache | null
  onChange: (value: DanmakuCache | null) => void
}) => {
  const { data: options, isFetching } = useAllDanmakuQuery()

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
