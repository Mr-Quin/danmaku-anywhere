import { Box, Collapse, Divider, List, Typography } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { ExternalLink } from '@/common/components/ExternalLink'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'
import { BilibiliOptions } from '@/popup/pages/options/pages/danmakuSource/components/BilibiliOptions'
import { DanDanPlayOptions } from '@/popup/pages/options/pages/danmakuSource/components/DanDanPlayOptions'
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

  const isAnyLoading = isPending || update.isPending

  const getOptionProps = (key: string) => {
    if (key === 'bilibili') {
      return {
        isLoading: isAnyLoading || isBilibiliLoading,
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
        isLoading: isAnyLoading || isTencentLoading,
        onToggle: toggleTencent,
        disableToggle: !canEnable,
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
    return {
      isLoading: isAnyLoading,
    }
  }

  const renderSectionHeader = (key: string) => {
    if (key === 'bilibili') {
      return <BilibiliOptions />
    }
    if (key === 'dandanplay') {
      return <DanDanPlayOptions />
    }
    return null
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.danmakuSource')} />
      <List disablePadding>
        {sourcesList.map(({ key, options, provider }) => {
          return (
            <>
              <Divider />
              <ToggleListItemButton
                key={key}
                enabled={options.enabled}
                onToggle={(checked) => {
                  void toggle(key, checked)
                }}
                itemText={t(localizedDanmakuSourceType(provider))}
                {...getOptionProps(key)}
              />
              <Box px={2} my={1}>
                <Collapse in>{renderSectionHeader(key)}</Collapse>
              </Box>
            </>
          )
        })}
      </List>
    </OptionsPageLayout>
  )
}
