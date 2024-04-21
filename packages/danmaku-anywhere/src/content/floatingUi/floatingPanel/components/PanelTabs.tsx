import { Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '../../../store/popupStore'

const tabMap = {
  [PopupTab.Search]: 'tabs.search',
  [PopupTab.Selector]: 'tabs.selector',
  [PopupTab.Comments]: 'tabs.danmaku',
  [PopupTab.Mount]: 'tabs.mount',
  [PopupTab.Info]: 'debug',
}

export const PanelTabs = () => {
  const { t } = useTranslation()
  const { tab, setTab } = usePopup()

  const handleTabChange = (_: any, value: PopupTab) => {
    setTab(value)
  }

  const tabs = match(tab)
    .with(PopupTab.Selector, () => {
      return [PopupTab.Selector]
    })
    .otherwise(() => {
      return [
        PopupTab.Search,
        PopupTab.Comments,
        PopupTab.Mount,
        import.meta.env.DEV && PopupTab.Info,
      ].filter(Boolean) as PopupTab[]
    })

  return (
    <Tabs
      value={tab}
      onChange={handleTabChange}
      aria-label="Popup"
      variant="scrollable"
      scrollButtons="auto"
      orientation="vertical"
      sx={{
        borderRight: 1,
        borderColor: 'divider',
        width: 100,
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => (
        <Tab label={t(tabMap[tab])} value={tab} key={tab} />
      ))}
    </Tabs>
  )
}
