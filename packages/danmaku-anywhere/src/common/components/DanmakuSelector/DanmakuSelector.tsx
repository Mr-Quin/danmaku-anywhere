import type { createFilterOptions } from '@mui/material'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { EpisodeOption } from './EpisodeOption'

import { ListboxComponent } from '@/common/components/DanmakuSelector/ListboxComponent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { matchWithPinyin, stopKeyboardPropagation } from '@/common/utils/utils'

type FilterOptions = ReturnType<typeof createFilterOptions<DanmakuLite>>

const stringifyDanmakuMeta = (danmakuLite: DanmakuLite) => {
  return `${danmakuLite.seasonTitle} ${danmakuLite.episodeTitle}`
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
  if (option.provider !== value.provider) return false
  if (isDanmakuProvider(option, DanmakuSourceType.Custom)) {
    return (
      option.seasonTitle === value.seasonTitle &&
      option.episodeTitle === value.episodeTitle
    )
  }
  return option.episodeId === value.episodeId
}

interface DanmakuSelectorProps {
  value: DanmakuLite | null
  onChange: (value: DanmakuLite | null) => void
}

export const DanmakuSelector = ({ value, onChange }: DanmakuSelectorProps) => {
  const { t } = useTranslation()

  const { data: options, isFetching } = useAllDanmakuSuspense()

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
            key={option.id}
            option={options.find((o) => isOptionEqualToValue(o, option))!}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) => option.episodeTitle}
      getOptionKey={(option) => option.id}
      groupBy={(option) => option.seasonTitle}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.seasonTitle : t('anime.episode.select')}
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
