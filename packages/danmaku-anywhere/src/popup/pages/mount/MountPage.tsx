import { Box, Typography } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { match, P } from 'ts-pattern'

import { MountController } from './components/MountController'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useAllDanmakuQuerySuspense } from '@/common/hooks/useAllDanmakuQuerySuspense'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { sleep } from '@/common/utils'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'

const HasDanmaku = ({ children }: PropsWithChildren) => {
  const { data } = useAllDanmakuQuerySuspense()

  if (data.length === 0) {
    return (
      <Box p={2}>
        <Typography>No danmaku found.</Typography>
        <Box mt={2}>
          <Typography color="primary" to="/search" component={Link}>
            Search and danmaku to enable the controller
          </Typography>
        </Box>
      </Box>
    )
  }

  return children
}

const IsConnected = ({ children }: PropsWithChildren) => {
  const { data: isTabConnected } = useSuspenseQuery({
    queryKey: ['tab', 'ping'],
    queryFn: async () => {
      try {
        const res = await Promise.any([await tabRpcClient.ping(), sleep(1500)])
        return res === true
      } catch (e) {
        Logger.debug('Content script is not connected')

        return false
      }
    },
    retry: 0,
  })

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
            return <Typography>No active tab</Typography>
          })
          .with(P.string.regex(/^chrome:\/\//), () => {
            return (
              <Typography>Chrome internal pages are not supported</Typography>
            )
          })
          .otherwise(() => {
            return (
              <>
                <Typography>
                  The current page
                  <br />
                  <Typography
                    component="span"
                    color={(theme) => theme.palette.text.disabled}
                    sx={{ wordWrap: 'break-word' }}
                  >
                    {activeTabUrl}
                  </Typography>
                  <br />
                  does not have a mount configuration, or is not configured
                  correctly.
                </Typography>
                <Box my={2}>
                  <Typography color="primary" to="/config/add" component={Link}>
                    Add a mount configuration to enable the controller
                  </Typography>
                </Box>
                <Typography>
                  If this happens after updating the extension, try restarting
                  the browser.
                </Typography>
              </>
            )
          })}
      </Box>
    )
  }

  return children
}

export const MountPage = () => {
  return (
    <TabLayout>
      <Suspense fallback={<FullPageSpinner />}>
        <TabToolbar title="Mount Controller" />
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
