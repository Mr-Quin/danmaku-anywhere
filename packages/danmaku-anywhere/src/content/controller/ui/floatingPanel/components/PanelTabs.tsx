import { Badge, Tab, Tabs } from '@mui/material'
import { match } from 'ts-pattern'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { isConfigIncomplete } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'
import { routes } from '@/content/controller/ui/router/routes'

export const PanelTabs = () => {
  const { tab, setTab } = usePopup()
  const { data: options } = useExtensionOptions()
  const activeConfig = useActiveConfig()

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
          return options.debug
        }
        return true
      })
    })

  const isIncomplete = activeConfig && isConfigIncomplete(activeConfig)

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
        <Tab
          label={
            tab.tab === PopupTab.Policy && isIncomplete ? (
              <Badge color="warning" variant="dot">
                {tab.name()}
              </Badge>
            ) : (
              tab.name()
            )
          }
          value={tab.tab}
          key={tab.tab}
        />
      ))}
    </Tabs>
  )
}
