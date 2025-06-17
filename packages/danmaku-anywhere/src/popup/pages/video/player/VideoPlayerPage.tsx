import { TabLayout } from '@/content/common/TabLayout'
import { LocalVideoPlayer } from '@/popup/pages/video/local/components/LocalVideoPlayer'

import { TabToolbar } from '@/content/common/TabToolbar'
import { ExternalVideoPage } from '@/popup/pages/video/player/ExternalVideoPage'
import type { KazumiSearchResult } from '@/popup/pages/video/player/scraper/videoScraper'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

export const VideoPlayerPage = () => {
  const { t } = useTranslation()
  const location = useLocation()

  const content = location.state?.content as KazumiSearchResult

  if (content) {
    return <ExternalVideoPage content={content} />
  }

  return (
    <TabLayout>
      <TabToolbar title={t('player')} />
      <LocalVideoPlayer showFilePicker />
    </TabLayout>
  )
}
