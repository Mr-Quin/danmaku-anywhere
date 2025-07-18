import { ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  List,
  Typography,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import { ExternalLink } from '@/common/components/ExternalLink'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'
import { useToggleBilibili } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleBilibili'
import { useToggleTencent } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleTencent'
import { BilibiliOptionsContent } from './components/BilibiliOptionsContent'
import { DanDanPlayOptionsContent } from './components/DanDanPlayOptionsContent'

export const DanmakuSourceSection = () => {
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

  const getSourceOptions = (key: string) => {
    switch (key) {
      case 'bilibili':
        return <BilibiliOptionsContent />
      case 'dandanplay':
        return <DanDanPlayOptionsContent />
      default:
        return null
    }
  }

  return (
    <Box>
      <List disablePadding>
        {sourcesList.map(({ key, options, provider }) => {
          const sourceOptions = getSourceOptions(key)
          const isEnabled = Boolean(options.enabled)

          return (
            <Box key={key}>
              <ToggleListItemButton
                enabled={isEnabled}
                disableToggle={isAnyLoading}
                onToggle={(checked) => {
                  void toggle(key, checked)
                }}
                itemText={t(localizedDanmakuSourceType(provider))}
                isLoading={isPending}
                {...getOptionProps(key)}
              />

              {sourceOptions && isEnabled ? (
                <Accordion
                  variant="outlined"
                  sx={{ ml: 2, mr: 2, mb: 1 }}
                  disableGutters
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{ minHeight: 48 }}
                  >
                    <Typography variant="body2">
                      {t('optionsPage.danmakuSource.advancedSettings')}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    {sourceOptions}
                  </AccordionDetails>
                </Accordion>
              ) : null}
            </Box>
          )
        })}
      </List>
    </Box>
  )
}
