import { useTranslation } from 'react-i18next'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ShowSkipButtonListItem } from './components/ShowSkipButtonListItem'

export const PlayerOptions = () => {
  const { t } = useTranslation()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.player')} />
      <ShowSkipButtonListItem />
    </OptionsPageLayout>
  )
}
