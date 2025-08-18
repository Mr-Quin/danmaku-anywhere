import { Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  type DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'

interface SeasonSearchTabsProps {
  providers: DanmakuSourceType[]
  selectedTab: DanmakuSourceType
  onTabChange: (tab: DanmakuSourceType) => void
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
      }}
    >
      {providers.map((provider) => {
        return (
          <Tab
            value={provider}
            label={t(localizedDanmakuSourceType(provider))}
            key={provider}
          />
        )
      })}
    </Tabs>
  )
}
