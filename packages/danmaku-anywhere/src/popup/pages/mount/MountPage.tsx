import { Box, Typography } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, type PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { match, P } from 'ts-pattern'

import { useIsConnected } from '../../hooks/useIsConnected'

import { MountController } from './components/MountController'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

const HasDanmaku = ({ children }: PropsWithChildren) => {
  const { data } = useAllDanmakuQuerySuspense()
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <Box p={2}>
        <Typography>{t('mountPage.noDanmaku')}</Typography>
        <Box mt={2}>
          <Typography color="primary" to="/search" component={Link}>
            {t('mountPage.noDanmakuHelp')}
          </Typography>
        </Box>
      </Box>
    )
  }

  return children
}

const IsConnected = ({ children }: PropsWithChildren) => {
  const { data: isTabConnected } = useIsConnected()
  const { t } = useTranslation()

  const { data: activeTabUrl } = useSuspenseQuery({
    queryKey: ['chrome', 'tabs', 'query'],
    queryFn: async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })
        return tabs[0].url ?? ''
      } catch (e) {
        return ''
      }
    },
    retry: 0,
  })

  if (!isTabConnected) {
    return (
      <Box p={2}>
        {match(activeTabUrl)
          .with('', () => {
            return <Typography>{t('mountPage.noActiveTab')}</Typography>
          })
          .with(P.string.regex(/^chrome:\/\//), () => {
            return <Typography>{t('mountPage.unsupported')}</Typography>
          })
          .otherwise(() => {
            return (
              <>
                <Typography>{t('mountPage.unavailable')}</Typography>
                <Box my={2}>
                  <Typography color="primary" to="/config/add" component={Link}>
                    {t('mountPage.addMountConfig')}
                  </Typography>
                </Box>
                <Typography>{t('mountPage.unavailableTips')}</Typography>
              </>
            )
          })}
      </Box>
    )
  }

  return children
}

export const MountPage = () => {
  const { t } = useTranslation()

  return (
    <TabLayout>
      <Suspense fallback={<FullPageSpinner />}>
        <TabToolbar title={t('mountPage.pageTitle')} />
        <IsConnected>
          <HasDanmaku>
            <Box p={2}>
              <MountController />
            </Box>
          </HasDanmaku>
        </IsConnected>
      </Suspense>
    </TabLayout>
  )
}
