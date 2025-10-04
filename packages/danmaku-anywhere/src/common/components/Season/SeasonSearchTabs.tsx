import { Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SeasonSearchTabsProps {
  providers: ProviderConfig[]
  selectedProvider: ProviderConfig
  onTabChange: (tab: ProviderConfig) => void
}

export const SeasonSearchTabs = ({
  providers,
  selectedProvider,
  onTabChange,
}: SeasonSearchTabsProps) => {
  const { t } = useTranslation()

  return (
    <Tabs
      value={selectedProvider}
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
            value={provider}
            label={
              provider.isBuiltIn
                ? t(localizedDanmakuSourceType(provider.impl))
                : provider.name
            }
            key={provider.id}
          />
        )
      })}
    </Tabs>
  )
}
