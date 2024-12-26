import { Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { routes } from '@/content/controller/ui/router/routes'

export const PanelTabs = () => {
  const { t } = useTranslation()
  const { tab, setTab } = usePopup()

  const handleTabChange = (_: unknown, value: PopupTab) => {
    setTab(value)
  }

  const tabs = match(tab)
    .with(PopupTab.Selector, () => {
      return routes.filter((route) => route.tab === PopupTab.Selector)
    })
    .otherwise(() => {
      return routes.filter((route) => {
        if (route.tab === PopupTab.Selector) return false
        if (route.tab === PopupTab.Debug) {
          return import.meta.env.DEV
        }
        return true
      })
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
        <Tab label={t(tab.name)} value={tab.tab} key={tab.tab} />
      ))}
    </Tabs>
  )
}
