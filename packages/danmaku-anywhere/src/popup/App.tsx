import { Typography } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { Suspense, use, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'
import { useStore } from './store'

import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { db } from '@/common/db/db'
import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { sleep } from '@/common/utils'

const LoadInitialData = ({ children }: PropsWithChildren) => {
  use(db.isReady)

  // Check if the content script is connected
  const { data } = useSuspenseQuery({
    queryKey: ['ping'],
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

  useEffect(() => {
    useStore.setState({ isTabConnected: data })
  }, [data])

  return children
}

export const App = () => {
  return (
    <PopupLayout>
      <ErrorBoundary
        onError={Logger.error}
        fallback={
          <Center>
            <Typography>Something went horribly wrong</Typography>
          </Center>
        }
      >
        <Suspense fallback={<FullPageSpinner />}>
          <LoadInitialData>
            <RootRouter />
          </LoadInitialData>
        </Suspense>
      </ErrorBoundary>
    </PopupLayout>
  )
}
