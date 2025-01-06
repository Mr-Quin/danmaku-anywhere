import type { createFilterOptions } from '@mui/material'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EpisodeOption } from './EpisodeOption'

import { ListboxComponent } from '@/common/components/DanmakuSelector/ListboxComponent'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { isDanmakuProvider } from '@/common/danmaku/utils'
import { matchWithPinyin } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

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
  height?: number
}

const groupBy = (option: DanmakuLite) =>
  `${option.provider}::${option.seasonTitle}`

export const DanmakuSelector = ({
  value,
  onChange,
  height,
}: DanmakuSelectorProps) => {
  const { t } = useTranslation()

  const { data: options, isFetching } = useAllDanmakuSuspense()

  const sortedOptions = useMemo(() => {
    return options.sort((a, b) => {
      const aGroup = groupBy(a)
      const bGroup = groupBy(b)

      if (aGroup === bGroup) {
        if (a.episodeId !== undefined && b.episodeId !== undefined) {
          if (a.episodeId === b.episodeId) {
            return 0
          } else {
            return a.episodeId > b.episodeId ? 1 : -1
          }
        }
        return a.episodeTitle.localeCompare(b.episodeTitle)
      }

      return aGroup.localeCompare(bGroup)
    })
  }, [options])

  return (
    <Autocomplete
      value={value} // value must be null when empty so that the component is "controlled"
      loading={isFetching}
      options={sortedOptions}
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
            option={sortedOptions.find((o) => isOptionEqualToValue(o, option))!}
            isLoading={isFetching}
          />
        )
      }}
      getOptionLabel={(option) => option.episodeTitle}
      getOptionKey={(option) => option.id}
      groupBy={groupBy}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.seasonTitle : t('anime.episode.select')}
            slotProps={{
              input: {
                ...params.InputProps,
                ...withStopPropagation(),
                endAdornment: (
                  <>
                    {isFetching ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )
      }}
      slotProps={{
        listbox: {
          style: {
            height,
          },
          component: ListboxComponent,
        },
      }}
      renderGroup={(params) => params as any}
      disablePortal
    />
  )
}
