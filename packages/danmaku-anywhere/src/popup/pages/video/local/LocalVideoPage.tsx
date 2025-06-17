import { TabLayout } from '@/content/common/TabLayout'
import { LocalVideoPlayer } from '@/popup/pages/video/local/LocalVideoPlayer'

import { useTranslation } from 'react-i18next'

export const LocalVideoPage = () => {
  const { t } = useTranslation()

  return (
    <TabLayout>
      <LocalVideoPlayer showFilePicker />
    </TabLayout>
  )
}
