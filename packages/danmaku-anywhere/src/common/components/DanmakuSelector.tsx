import {
  Autocomplete,
  CircularProgress,
  TextField,
  createFilterOptions,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

import { DanmakuType } from '../types/danmaku/Danmaku'
import type { DanmakuMeta } from '../types/danmaku/Danmaku'

import { EpisodeOption } from './EpisodeOption'

import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuMeta) =>
    `${option.animeTitle} ${option.episodeTitle}`,
})

const isOptionEqualToValue = (option: DanmakuMeta, value: DanmakuMeta) => {
  return match([option, value])
    .with(
      [{ type: DanmakuType.DDP }, { type: DanmakuType.DDP }],
      ([option, value]) => {
        return option.episodeId === value.episodeId
      }
    )
    .with(
      [{ type: DanmakuType.Custom }, { type: DanmakuType.Custom }],
      ([option, value]) => {
        return (
          option.animeTitle === value.animeTitle &&
          option.episodeTitle === value.episodeTitle
        )
      }
    )
    .otherwise(() => false)
}

interface DanmakuSelectorProps {
  value: DanmakuMeta | null
  onChange: (value: DanmakuMeta | null) => void
}

export const DanmakuSelector = ({ value, onChange }: DanmakuSelectorProps) => {
  const { t } = useTranslation()

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
            key={
              option.type === DanmakuType.DDP
                ? option.episodeId
                : `${option.animeTitle}-${option.episodeTitle}`
            }
            option={options.find((o) => isOptionEqualToValue(o.meta, option))!}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) => option.episodeTitle ?? option.animeTitle}
      groupBy={(option) => option.animeTitle}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.animeTitle : t('anime.episode.select')}
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
