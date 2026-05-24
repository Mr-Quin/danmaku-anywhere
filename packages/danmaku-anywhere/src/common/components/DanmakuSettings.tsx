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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockTab } from '@/common/components/DanmakuFilter/BlockTab'
import { CollapseTab } from '@/common/components/DanmakuFilter/CollapseTab'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
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

  function update(updater: (draft: Draft<DanmakuOptions>) => void) {
    void partialUpdate(produce(config, updater))
  }

  function updateCollapse(updater: (draft: Draft<CollapseConfig>) => void) {
    update((draft) => {
      updater(draft.collapse)
    })
  }

  function handleAddBlock(rule: DanmakuFilter) {
    update((draft) => {
      draft.filters.push(rule)
    })
  }

  function handleEditBlock(index: number, rule: DanmakuFilter) {
    update((draft) => {
      draft.filters[index] = rule
    })
  }

  function handleDeleteBlock(index: number) {
    update((draft) => {
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
              icon: <TuneOutlinedIcon fontSize="small" />,
            },
            {
              value: 'block',
              label: t('danmakuFilter.blockTab', 'Block'),
              icon: <CloseOutlinedIcon fontSize="small" />,
              badge: blockCount,
            },
            {
              value: 'collapse',
              label: t('danmakuFilter.collapseTab', 'Collapse'),
              icon: <AutoAwesomeOutlinedIcon fontSize="small" />,
              badge: collapseCount,
            },
          ]}
        />
      </Box>
      {segment === 'style' && (
        <ScrollBox sx={{ px: 3, pb: 2, maxWidth: '100%', overflowX: 'hidden' }}>
          <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
        </ScrollBox>
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
    </TabLayout>
  )
}
