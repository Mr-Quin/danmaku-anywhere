import { Tab, Tabs } from '@mui/material'

import { PopupTab, usePopup } from '../../../store/popupStore'

export const PanelTabs = () => {
  const { tab, setTab } = usePopup()

  const handleTabChange = (_: any, value: PopupTab) => {
    setTab(value)
  }

  const tabs =
    tab === PopupTab.Selector
      ? [PopupTab.Selector]
      : [
          PopupTab.Search,
          PopupTab.Comments,
          PopupTab.Mount,
          import.meta.env.DEV && PopupTab.Info,
        ].filter(Boolean)

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
        <Tab label={tab} value={tab} key={tab} />
      ))}
    </Tabs>
  )
}
