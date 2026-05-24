import type {
  CollapseConfig,
  DanmakuFilter,
} from '@danmaku-anywhere/danmaku-engine'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import UnfoldLessOutlinedIcon from '@mui/icons-material/UnfoldLessOutlined'
import { Box } from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { SegmentedTabs } from '@/common/components/SegmentedTabs'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { BlockTab } from './BlockTab'
import { CollapseTab } from './CollapseTab'
import { DanmakuStylesForm, type SaveStatus } from './DanmakuStylesForm'
import { SaveStatusIndicator } from './SaveStatusIndicator'

type Segment = 'style' | 'block' | 'collapse'

export function DanmakuSettingsPageCore() {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()
  const [segment, setSegment] = useState<Segment>('style')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the latest config across in-flight updates so rapid edits compose
  // instead of clobbering each other (React would still hold the pre-await config).
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])
  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    },
    []
  )

  async function update(updater: (draft: Draft<DanmakuOptions>) => void) {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setSaveStatus('saving')
    const next = produce(configRef.current, updater)
    configRef.current = next
    try {
      await partialUpdate(next)
      setSaveStatus('saved')
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('idle')
    }
  }

  function updateCollapse(updater: (draft: Draft<CollapseConfig>) => void) {
    void update((draft) => {
      updater(draft.collapse)
    })
  }

  function handleAddBlock(rule: DanmakuFilter) {
    void update((draft) => {
      draft.filters.push(rule)
    })
  }

  function handleEditBlock(index: number, rule: DanmakuFilter) {
    void update((draft) => {
      draft.filters[index] = rule
    })
  }

  function handleDeleteBlock(index: number) {
    void update((draft) => {
      draft.filters.splice(index, 1)
    })
  }

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name', 'Danmaku Settings')}>
        <SaveStatusIndicator status={saveStatus} />
      </TabToolbar>
      <Box sx={{ px: 2, pb: 0.5 }}>
        <SegmentedTabs
          value={segment}
          onChange={(v) => setSegment(v as Segment)}
          items={[
            {
              value: 'style',
              label: t('stylePage.style', 'Style'),
              icon: <TuneOutlinedIcon sx={{ fontSize: 14 }} />,
            },
            {
              value: 'block',
              label: t('danmakuFilter.blockTab', 'Block'),
              icon: <CloseOutlinedIcon sx={{ fontSize: 14 }} />,
            },
            {
              value: 'collapse',
              label: t('danmakuFilter.collapseTab', 'Collapse'),
              icon: <UnfoldLessOutlinedIcon sx={{ fontSize: 14 }} />,
            },
          ]}
        />
      </Box>
      <Box sx={{ px: 2, pt: 0.5, pb: 2 }}>
        {segment === 'style' && (
          <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
        )}
        {segment === 'block' && (
          <BlockTab
            filters={config.filters}
            onAdd={handleAddBlock}
            onEdit={handleEditBlock}
            onDelete={handleDeleteBlock}
          />
        )}
        {segment === 'collapse' && (
          <CollapseTab
            collapse={config.collapse}
            onChange={updateCollapse}
            onEditPattern={(index, pattern) =>
              updateCollapse((draft) => {
                draft.pattern.patterns[index] = pattern
              })
            }
            onEditWhiteList={(index, rule) =>
              updateCollapse((draft) => {
                draft.whiteList[index] = rule
              })
            }
          />
        )}
      </Box>
    </TabLayout>
  )
}
