import type {
  CollapseConfig,
  DanmakuFilter,
} from '@danmaku-anywhere/danmaku-engine'
import { Tab, Tabs } from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { TabToolbar } from '../layout/TabToolbar'
import { BlockTab } from './BlockTab'
import { CollapseTab } from './CollapseTab'

type FilterPageCoreProps = {
  onGoBack: () => void
  showBackButton?: boolean
  initialFilter?: string
}

type FilterTab = 'block' | 'collapse'

export function FilterPageCore({
  onGoBack,
  initialFilter,
  showBackButton,
}: FilterPageCoreProps) {
  const { t } = useTranslation()
  const { data: config, partialUpdate } = useDanmakuOptions()

  const [activeTab, setActiveTab] = useState<FilterTab>('block')

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

  return (
    <TabLayout>
      <TabToolbar
        title={t('tabs.filter', 'Filter')}
        onGoBack={onGoBack}
        showBackButton={showBackButton}
      />
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as FilterTab)}
        variant="fullWidth"
      >
        <Tab value="block" label={t('danmakuFilter.blockTab', 'Block')} />
        <Tab
          value="collapse"
          label={t('danmakuFilter.collapseTab', 'Collapse')}
        />
      </Tabs>
      {activeTab === 'block' && (
        <BlockTab
          filters={config.filters}
          onAdd={handleAddBlock}
          onEdit={handleEditBlock}
          onDelete={handleDeleteBlock}
          initialFilter={initialFilter}
        />
      )}
      {activeTab === 'collapse' && (
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
