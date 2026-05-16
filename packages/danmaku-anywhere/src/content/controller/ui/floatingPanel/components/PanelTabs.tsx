import { Badge, Tab } from '@mui/material'
import { match } from 'ts-pattern'

import { SidebarTabs } from '@/common/components/SidebarTabs'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { isConfigIncomplete } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
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

  const isIncomplete = isConfigIncomplete(activeConfig)

  return (
    <SidebarTabs value={tab} onChange={handleTabChange} aria-label="Popup">
      {tabs.map((route) => {
        const icon =
          route.tab === PopupTab.Policy && isIncomplete ? (
            <span>
              <Badge color="warning" variant="dot">
                {route.icon}
              </Badge>
            </span>
          ) : (
            route.icon
          )

        return (
          <Tab
            icon={icon}
            iconPosition="top"
            label={route.name()}
            value={route.tab}
            key={route.tab}
          />
        )
      })}
    </SidebarTabs>
  )
}
