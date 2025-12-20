import { Divider } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import {
  DanmakuStylesForm,
  type SaveStatus,
} from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { SaveStatusIndicator } from '@/content/common/DanmakuStyles/SaveStatusIndicator'

export const StylesPage = () => {
  const { t } = useTranslation()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  return (
    <TabLayout>
      <TabToolbar title={t('stylePage.name', 'Danmaku Settings')}>
        <SaveStatusIndicator status={saveStatus} />
      </TabToolbar>
      <Divider />
      <ScrollBox px={3} pb={2} flexGrow={1} sx={{ overflowX: 'hidden' }}>
        <DanmakuStylesForm onSaveStatusChange={setSaveStatus} />
      </ScrollBox>
    </TabLayout>
  )
}
