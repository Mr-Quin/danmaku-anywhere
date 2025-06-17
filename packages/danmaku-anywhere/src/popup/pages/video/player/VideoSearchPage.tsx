import { NothingHere } from '@/common/components/NothingHere'
import { useKazumiPolicies } from '@/common/options/kazumiPolicy/useKazumiManifest'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useEnvironment } from '@/content/common/context/Environment'
import { VideoSearchResults } from '@/popup/pages/video/player/components/VideoSearchResults'
import { Box, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { PolicySelector } from './components/PolicySelector'

export const VideoSearchPage = () => {
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()
  const navigate = useNavigate()
  const { data: policies } = useKazumiPolicies()

  const openOptions = () => {
    void chrome.runtime.openOptionsPage()
  }

  if (isPopup) {
    return (
      <TabLayout>
        <TabToolbar title={t('tabs.videoSearch')} />
        <Box>
          <Button variant="contained" onClick={openOptions}>
            Open Options
          </Button>
        </Box>
      </TabLayout>
    )
  }

  if (policies.length === 0) {
    return (
      <NothingHere message={t('videoSearchPage.noPolicy')}>
        <Button
          variant="contained"
          onClick={() =>
            navigate('../kazumi', { relative: 'path', state: 'import' })
          }
        >
          {t('videoSearchPage.goToImport')}
        </Button>
      </NothingHere>
    )
  }

  return (
    <TabLayout>
      <TabToolbar title={t('tabs.videoSearch')} />
      <PolicySelector />
      <VideoSearchResults />
      <Outlet />
    </TabLayout>
  )
}
