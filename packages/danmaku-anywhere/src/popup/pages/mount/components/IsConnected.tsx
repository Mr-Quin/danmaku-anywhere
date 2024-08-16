import { Box, Typography } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { match, P } from 'ts-pattern'

import { useIsConnected } from '@/popup/hooks/useIsConnected'

export const IsConnected = ({ children }: PropsWithChildren) => {
  const { data: isTabConnected } = useIsConnected()
  const { t } = useTranslation()

  const { data: activeTabUrl } = useSuspenseQuery({
    queryKey: [
      {
        scope: 'chrome',
        kind: 'tab',
      },
    ],
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
