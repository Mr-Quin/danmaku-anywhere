import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { PolicyRepo } from '@/popup/pages/kazumi/pages/import/PolicyRepo'
import { Divider, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const ImportKazumiPolicyPage = () => {
  const { t } = useTranslation()
  const goBack = useGoBack()

  const [tabValue, setTabValue] = useState('repo')

  const handleTabChange = (_: any, newValue: string) => {
    setTabValue(newValue)
  }

  return (
    <TabLayout>
      <TabToolbar
        title={t('kazumiPage.import.name')}
        showBackButton
        onGoBack={goBack}
      />
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label={t('kazumiPage.import.repo')} value="repo" />
      </Tabs>
      <Divider />

      {tabValue === 'repo' && <PolicyRepo />}
    </TabLayout>
  )
}
