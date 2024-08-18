import {
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

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { sourcesList, toggleEnabled, isPending, update } = useDanmakuSources()

  const navigate = useNavigate()

  return (
    <>
      <OptionsPageLayout>
        <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
        <List disablePadding>
          {sourcesList.map(({ key, options, provider }) => {
            return (
              <ListItem
                key={key}
                secondaryAction={
                  <Switch
                    checked={options.enabled}
                    onChange={(e) => {
                      toggleEnabled.mutate({
                        key,
                        checked: e.target.checked,
                      })
                    }}
                    disabled={
                      isPending || update.isPending || toggleEnabled.isPending
                    }
                  />
                }
                disablePadding
              >
                <ListItemButton
                  onClick={() => navigate(key)}
                  disabled={key !== 'dandanplay'}
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
