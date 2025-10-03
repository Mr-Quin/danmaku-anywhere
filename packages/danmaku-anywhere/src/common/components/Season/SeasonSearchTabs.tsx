import { Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import {
  type ProviderConfig,
  providerTypeToDanmakuSource,
} from '@/common/options/providerConfig/schema'

interface SeasonSearchTabsProps {
  providers: ProviderConfig[]
  selectedTab: string
  onTabChange: (tab: string) => void
}

export const SeasonSearchTabs = ({
  providers,
  selectedTab,
  onTabChange,
}: SeasonSearchTabsProps) => {
  const { t } = useTranslation()

  return (
    <Tabs
      value={selectedTab}
      onChange={(_, value) => onTabChange?.(value)}
      sx={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'background.paper',
        zIndex: 1,
        '.MuiTabs-scrollButtons.Mui-disabled': {
          opacity: 0.3,
        },
      }}
      scrollButtons
      allowScrollButtonsMobile
      variant="scrollable"
    >
      {providers.map((provider) => {
        return (
          <Tab
            value={provider.id}
            label={
              provider.isBuiltIn
                ? t(
                    localizedDanmakuSourceType(
                      providerTypeToDanmakuSource[provider.type]
                    )
                  )
                : provider.name
            }
            key={provider.id}
          />
        )
      })}
    </Tabs>
  )
}
