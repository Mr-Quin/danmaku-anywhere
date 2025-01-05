import { List, Typography } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { ExternalLink } from '@/common/components/ExternalLink'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'
import { useToggleBilibili } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleBilibili'
import { useToggleTencent } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleTencent'

export const DanmakuSource = () => {
  const { t } = useTranslation()
  const { sourcesList, toggle, isPending, update } = useDanmakuSources()

  const {
    toggle: toggleBilibili,
    isLoading: isBilibiliLoading,
    loginStatus,
  } = useToggleBilibili()

  const {
    toggle: toggleTencent,
    isLoading: isTencentLoading,
    canEnable,
  } = useToggleTencent()

  const isAnyLoading =
    isPending || update.isPending || isBilibiliLoading || isTencentLoading

  const navigate = useNavigate()

  const getOptionProps = (key: string) => {
    if (key === 'bilibili') {
      return {
        isLoading: isBilibiliLoading,
        onToggle: toggleBilibili,
        showWarning: loginStatus?.isLogin === false,
        warningTooltip: (
          <>
            <Typography variant="subtitle2">
              {/* @ts-ignore */}
              <Trans i18nKey="danmakuSource.tooltip.bilibiliNotLoggedIn">
                <ExternalLink
                  color="primary"
                  to="https://www.bilibili.com"
                  target="_blank"
                  rel="noreferrer"
                />
              </Trans>
            </Typography>
          </>
        ),
      }
    }
    if (key === 'tencent') {
      return {
        isLoading: isTencentLoading,
        onToggle: toggleTencent,
        disableToggle: !canEnable || isAnyLoading,
        showWarning: !canEnable,
        warningTooltip: (
          <Typography variant="subtitle2">
            {/* @ts-ignore */}
            <Trans i18nKey="danmakuSource.tooltip.tencentCookieMissing">
              <ExternalLink
                color="primary"
                to="https://v.qq.com"
                target="_blank"
                rel="noreferrer"
              />
            </Trans>
          </Typography>
        ),
      }
    }
    return {}
  }

  return (
    <>
      <OptionsPageLayout>
        <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
        <List disablePadding>
          {sourcesList.map(({ key, options, provider }) => {
            return (
              <ToggleListItemButton
                key={key}
                enabled={options.enabled}
                disableToggle={isAnyLoading}
                onClick={() => {
                  navigate(key)
                }}
                onToggle={(checked) => {
                  void toggle(key, checked)
                }}
                itemText={t(localizedDanmakuSourceType(provider))}
                isLoading={isPending}
                {...getOptionProps(key)}
              />
            )
          })}
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
