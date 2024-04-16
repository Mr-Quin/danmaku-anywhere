import {
  Autocomplete,
  CircularProgress,
  TextField,
  createFilterOptions,
} from '@mui/material'
import { useMemo } from 'react'

import { EpisodeOption } from './EpisodeOption'

import type { DanmakuMeta } from '@/common/db/db'
import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import { episodeIdToEpisodeNumber } from '@/common/utils/utils'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuMeta) =>
    `${option.animeTitle} ${option.episodeTitle}`,
})

const isOptionEqualToValue = (option: DanmakuMeta, value: DanmakuMeta) => {
  return option.episodeId === value.episodeId
}

interface DanmakuSelectorProps {
  value: DanmakuMeta | null
  onChange: (value: DanmakuMeta | null) => void
}

export const DanmakuSelector = ({ value, onChange }: DanmakuSelectorProps) => {
  const { data: options, isFetching } = useAllDanmakuQuerySuspense()

  const metas = useMemo(() => options.map((option) => option.meta), [options])

  return (
    <Autocomplete
      value={value} // value must be null when empty so that the component is "controlled"
      loading={isFetching}
      options={metas}
      filterOptions={filterOptions}
      isOptionEqualToValue={isOptionEqualToValue}
      onChange={(e, value) => {
        onChange(value ?? null)
      }}
      renderOption={(props, option) => {
        return (
          <EpisodeOption
            {...props}
            key={option.episodeId}
            option={options.find((o) => o.meta.episodeId === option.episodeId)!}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) =>
        option.episodeTitle ??
        `Episode ${episodeIdToEpisodeNumber(option.episodeId)}`
      }
      groupBy={(option) => option.animeTitle}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.animeTitle : 'Select Episode'}
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
