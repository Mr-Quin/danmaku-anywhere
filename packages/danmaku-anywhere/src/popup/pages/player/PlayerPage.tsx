import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useEnvironment } from '@/popup/context/Environment'
import { Box, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { RuleSelector } from './components/RuleSelector'

export const PlayerPage = () => {
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()

  const openOptions = () => {
    void chrome.runtime.openOptionsPage()
  }

  if (isPopup) {
    return (
      <TabLayout>
        <TabToolbar title={t('tabs.player')} />
        <Box>
          <Button variant="contained" onClick={openOptions}>
            Open Options
          </Button>
        </Box>
      </TabLayout>
    )
  }
  return (
    <TabLayout>
      <TabToolbar title={t('tabs.player')} />
      <RuleSelector />
      <Outlet />
    </TabLayout>
  )
}
