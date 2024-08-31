import {
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Switch,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router-dom'

import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { BilibiliListItem } from '@/popup/pages/options/pages/danmakuSource/components/BilibiliListItem'

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { sourcesList, toggle, isPending, update } = useDanmakuSources()

  const navigate = useNavigate()

  return (
    <>
      <OptionsPageLayout>
        <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
        <List disablePadding>
          {sourcesList.map(({ key, options, provider }) => {
            if (key === 'bilibili')
              return (
                <BilibiliListItem
                  key={key}
                  enabled={options.enabled}
                  disableToggle={isPending || update.isPending}
                  onClick={() => {
                    navigate(key)
                  }}
                  text={t(localizedDanmakuSourceType(provider))}
                />
              )

            const renderAction = () => {
              if (update.isPending) return <CircularProgress size={24} />
              return (
                <Switch
                  checked={options.enabled}
                  onChange={(e) => {
                    void toggle(key, e.target.checked)
                  }}
                  disabled={isPending || update.isPending}
                />
              )
            }

            return (
              <ListItem
                key={key}
                secondaryAction={renderAction()}
                disablePadding
              >
                <ListItemButton
                  onClick={() => {
                    navigate(key)
                  }}
                >
                  <ListItemText
                    primary={t(localizedDanmakuSourceType(provider))}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
