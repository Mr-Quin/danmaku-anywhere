import { Box, Stack, Typography } from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { TabToolbar } from '../layout/TabToolbar'
import { ActiveFilterList } from './ActiveFilterList'
import { AddFilter } from './AddFilter'
import { TestFilter } from './TestFilter'
import { isRegex, validatePattern, validateRegex } from './utils'

type FilterPageCoreProps = {
  onGoBack: () => void
  showBackButton?: boolean
  initialFilter?: string
}

export const FilterPageCore = ({
  onGoBack,
  initialFilter,
  showBackButton,
}: FilterPageCoreProps) => {
  const { t } = useTranslation()
  const {
    data: config,
    partialUpdate,
    update: { isPending },
  } = useDanmakuOptions()

  const [filterError, setFilterError] = useState<string>('')

  const handleUpdate = (updater: (draft: Draft<DanmakuOptions>) => void) => {
    void partialUpdate(produce(config, updater))
  }

  const handleAddFilter = (pattern: string) => {
    if (isRegex(pattern)) {
      const result = validateRegex(pattern, config.filters)
      if (!result.success) {
        setFilterError(result.error())
        return false
      }
      handleUpdate((draft) => {
        draft.filters.push({
          type: 'regex',
          value: result.pattern,
          enabled: true,
        })
      })
    } else {
      const result = validatePattern(pattern, config.filters)
      if (!result.success) {
        setFilterError(result.error())
        return false
      }
      handleUpdate((draft) => {
        draft.filters.push({
          type: 'text',
          value: result.pattern,
          enabled: true,
        })
      })
    }
    setFilterError('')
    return true
  }

  const handleDeleteFilter = (index: number) => {
    handleUpdate((draft) => {
      draft.filters.splice(index, 1)
    })
  }

  return (
    <TabLayout>
      <TabToolbar
        title={t('tabs.filter', 'Danmaku Filter')}
        onGoBack={onGoBack}
        showBackButton={showBackButton}
      />
      <Box p={2}>
        <Stack spacing={3}>
          <Typography variant="body1" color="text.secondary">
            {t('danmakuFilter.description')}
          </Typography>

          <AddFilter
            onAdd={handleAddFilter}
            isPending={isPending}
            error={filterError}
            onErrorClear={() => setFilterError('')}
            initialFilter={initialFilter}
          />

          <ActiveFilterList
            filters={config.filters}
            onDelete={handleDeleteFilter}
          />

          <TestFilter filters={config.filters} />
        </Stack>
      </Box>
    </TabLayout>
  )
}
