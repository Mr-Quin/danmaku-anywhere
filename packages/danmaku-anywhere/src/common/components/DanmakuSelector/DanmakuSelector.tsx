import type { createFilterOptions } from '@mui/material'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

import { EpisodeOption } from './EpisodeOption'

import { ListboxComponent } from '@/common/components/DanmakuSelector/ListboxComponent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { matchWithPinyin, stopKeyboardPropagation } from '@/common/utils/utils'

type FilterOptions = ReturnType<typeof createFilterOptions<DanmakuMeta>>

const stringifyDanmakuMeta = (danmakuMeta: DanmakuMeta) => {
  return `${danmakuMeta.animeTitle} ${danmakuMeta.episodeTitle}`
}

const filterOptions: FilterOptions = (options, { inputValue }) => {
  return options.filter((option) => {
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      inputValue.toLocaleLowerCase()
    )
  })
}

const isOptionEqualToValue = (option: DanmakuMeta, value: DanmakuMeta) => {
  return match([option, value])
    .with(
      [{ type: DanmakuSourceType.DDP }, { type: DanmakuSourceType.DDP }],
      ([option, value]) => {
        return option.episodeId === value.episodeId
      }
    )
    .with(
      [{ type: DanmakuSourceType.Custom }, { type: DanmakuSourceType.Custom }],
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
              option.type === DanmakuSourceType.DDP
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
              onKeyDown: (e) => {
                stopKeyboardPropagation(e)
              },
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
      renderGroup={(params) => params as any}
      ListboxComponent={ListboxComponent}
      disablePortal
    />
  )
}
