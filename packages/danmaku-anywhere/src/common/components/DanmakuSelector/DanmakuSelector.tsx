import type { createFilterOptions } from '@mui/material'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

import { EpisodeOption } from './EpisodeOption'

import { ListboxComponent } from '@/common/components/DanmakuSelector/ListboxComponent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmakuCache/db'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { matchWithPinyin, stopKeyboardPropagation } from '@/common/utils/utils'

type FilterOptions = ReturnType<typeof createFilterOptions<DanmakuLite>>

const stringifyDanmakuMeta = (danmakuMeta: DanmakuLite) => {
  return `${danmakuMeta.meta.seasonTitle} ${danmakuMeta.meta.episodeTitle}`
}

const filterOptions: FilterOptions = (options, { inputValue }) => {
  return options.filter((option) => {
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      inputValue.toLocaleLowerCase()
    )
  })
}

const isOptionEqualToValue = (option: DanmakuLite, value: DanmakuLite) => {
  return match([option, value])
    .with(
      [
        { provider: DanmakuSourceType.DDP },
        { provider: DanmakuSourceType.DDP },
      ],
      ([option, value]) => {
        return option.meta.episodeId === value.meta.episodeId
      }
    )
    .with(
      [
        { provider: DanmakuSourceType.Custom },
        { provider: DanmakuSourceType.Custom },
      ],
      ([option, value]) => {
        return (
          option.meta.seasonTitle === value.meta.seasonTitle &&
          option.meta.episodeTitle === value.meta.episodeTitle
        )
      }
    )
    .otherwise(() => false)
}

interface DanmakuSelectorProps {
  value: DanmakuLite | null
  onChange: (value: DanmakuLite | null) => void
}

export const DanmakuSelector = ({ value, onChange }: DanmakuSelectorProps) => {
  const { t } = useTranslation()

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
            key={
              option.provider === DanmakuSourceType.DDP
                ? option.meta.episodeId
                : `${option.meta.seasonTitle}-${option.meta.episodeTitle}`
            }
            option={options.find((o) => isOptionEqualToValue(o, option))!}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) =>
        option.meta.episodeTitle ?? option.meta.seasonTitle
      }
      groupBy={(option) => option.meta.seasonTitle}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.meta.seasonTitle : t('anime.episode.select')}
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
