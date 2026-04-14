import {
  Box,
  Button,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
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

  const [activeTab, setActiveTab] = useState(0)
  const [filterError, setFilterError] = useState<string>('')
  const [dedupFilterError, setDedupFilterError] = useState<string>('')
  const [localTolerance, setLocalTolerance] = useState<number | null>(null)

  const handleUpdate = (updater: (draft: Draft<DanmakuOptions>) => void) => {
    void partialUpdate(produce(config, updater))
  }

  // --- Filter tab handlers ---

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

  // --- Dedup tab handlers ---

  const handleAddWhitelistEntry = (pattern: string) => {
    if (isRegex(pattern)) {
      const result = validateRegex(pattern, config.dedup.whitelist)
      if (!result.success) {
        setDedupFilterError(result.error())
        return false
      }
      handleUpdate((draft) => {
        draft.dedup.whitelist.push({
          type: 'regex',
          value: result.pattern,
          enabled: true,
        })
      })
    } else {
      const result = validatePattern(pattern, config.dedup.whitelist)
      if (!result.success) {
        setDedupFilterError(result.error())
        return false
      }
      handleUpdate((draft) => {
        draft.dedup.whitelist.push({
          type: 'text',
          value: result.pattern,
          enabled: true,
        })
      })
    }
    setDedupFilterError('')
    return true
  }

  const handleDeleteWhitelistEntry = (index: number) => {
    handleUpdate((draft) => {
      draft.dedup.whitelist.splice(index, 1)
    })
  }

  const handleResetWhitelist = () => {
    handleUpdate((draft) => {
      draft.dedup.whitelist = defaultDanmakuOptions.dedup.whitelist.map(
        (f) => ({ ...f })
      )
    })
  }

  const renderFilterTab = () => (
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
  )

  const renderDedupTab = () => (
    <Box p={2}>
      <Stack spacing={3}>
        <Typography variant="body1" color="text.secondary">
          {t('danmakuFilter.dedup.description')}
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={config.dedup.enabled}
              onChange={(_, checked) => {
                handleUpdate((draft) => {
                  draft.dedup.enabled = checked
                })
              }}
            />
          }
          label={t('danmakuFilter.dedup.enableLabel')}
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('danmakuFilter.dedup.toleranceLabel')}
          </Typography>
          <Slider
            value={localTolerance ?? config.dedup.tolerance}
            onChange={(_, value) => {
              setLocalTolerance(value as number)
            }}
            onChangeCommitted={(_, value) => {
              setLocalTolerance(null)
              handleUpdate((draft) => {
                draft.dedup.tolerance = value as number
              })
            }}
            min={0}
            max={2}
            step={0.1}
            valueLabelDisplay="auto"
            marks={[
              { value: 0, label: '0s' },
              { value: 1, label: '1s' },
              { value: 2, label: '2s' },
            ]}
          />
        </Box>

        <Typography variant="subtitle2" color="text.secondary">
          {t('danmakuFilter.dedup.whitelistHelp')}
        </Typography>

        <AddFilter
          onAdd={handleAddWhitelistEntry}
          isPending={isPending}
          error={dedupFilterError}
          onErrorClear={() => setDedupFilterError('')}
        />

        <ActiveFilterList
          filters={config.dedup.whitelist}
          onDelete={handleDeleteWhitelistEntry}
        />

        <Button variant="outlined" onClick={handleResetWhitelist}>
          {t('danmakuFilter.dedup.resetButton')}
        </Button>

        <TestFilter filters={config.dedup.whitelist} />
      </Stack>
    </Box>
  )

  return (
    <TabLayout>
      <TabToolbar
        title={t('tabs.filter', 'Danmaku Filter')}
        onGoBack={onGoBack}
        showBackButton={showBackButton}
      />
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
      >
        <Tab label={t('danmakuFilter.filterTab', 'Filter')} />
        <Tab label={t('danmakuFilter.dedupTab', 'Dedup')} />
      </Tabs>
      {activeTab === 0 && renderFilterTab()}
      {activeTab === 1 && renderDedupTab()}
    </TabLayout>
  )
}
