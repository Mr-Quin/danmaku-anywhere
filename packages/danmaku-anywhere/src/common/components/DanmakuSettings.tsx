import type {
  CollapseConfig,
  DanmakuFilter,
} from '@danmaku-anywhere/danmaku-engine'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import { Box } from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockTab } from '@/common/components/DanmakuFilter/BlockTab'
import { CollapseTab } from '@/common/components/DanmakuFilter/CollapseTab'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { SegmentedTabs } from '@/common/components/SegmentedTabs'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'

type Segment = 'style' | 'block' | 'collapse'

export function DanmakuSettings() {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()
  const [segment, setSegment] = useState<Segment>('style')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function update(updater: (draft: Draft<DanmakuOptions>) => void) {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setSaveStatus('saving')
    try {
      await partialUpdate(produce(config, updater))
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

  const blockCount = config.filters.length
  const collapseCount =
    config.collapse.pattern.patterns.length + config.collapse.whiteList.length

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name', 'Danmaku Settings')}>
        <SaveStatusIndicator status={saveStatus} />
      </TabToolbar>
      <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
        <SegmentedTabs
          value={segment}
          onChange={(v) => setSegment(v as Segment)}
          items={[
            {
              value: 'style',
              label: t('danmakuFilter.styleTab', 'Style'),
              icon: <TuneOutlinedIcon sx={{ fontSize: 14 }} />,
            },
            {
              value: 'block',
              label: t('danmakuFilter.blockTab', 'Block'),
              icon: <CloseOutlinedIcon sx={{ fontSize: 14 }} />,
              badge: blockCount,
            },
            {
              value: 'collapse',
              label: t('danmakuFilter.collapseTab', 'Collapse'),
              icon: <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />,
              badge: collapseCount,
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
