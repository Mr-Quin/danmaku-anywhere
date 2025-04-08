import type { createFilterOptions } from '@mui/material'
import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EpisodeOption } from './EpisodeOption'

import { ListboxComponent } from '@/common/components/DanmakuSelector/ListboxComponent'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { matchWithPinyin } from '@/common/utils/utils'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

type SelectableEpisode = WithSeason<EpisodeLiteV4>

type FilterOptions = ReturnType<typeof createFilterOptions<SelectableEpisode>>

const stringifyDanmakuMeta = (danmakuLite: SelectableEpisode) => {
  return `${danmakuLite.season.title} ${danmakuLite.title}`
}

const filterOptions: FilterOptions = (options, { inputValue }) => {
  return options.filter((option) => {
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      inputValue.toLocaleLowerCase()
    )
  })
}

const isOptionEqualToValue = (
  option: SelectableEpisode,
  value: SelectableEpisode
) => {
  if (option.provider !== value.provider) return false
  return option.indexedId === value.indexedId
}

interface DanmakuSelectorProps {
  value: SelectableEpisode | null
  onChange: (value: SelectableEpisode | null) => void
  height?: number
}

const groupBy = (option: SelectableEpisode) =>
  `${option.provider}::${option.title}`

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
        if (a.indexedId !== undefined && b.indexedId !== undefined) {
          if (a.indexedId === b.indexedId) {
            return 0
          } else {
            return a.indexedId > b.indexedId ? 1 : -1
          }
        }
        return a.title.localeCompare(b.title)
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
      onChange={(_e, value) => {
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
      getOptionLabel={(option) => option.title}
      getOptionKey={(option) => option.id}
      groupBy={groupBy}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label={value ? value.season.title : t('anime.episode.select')}
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
