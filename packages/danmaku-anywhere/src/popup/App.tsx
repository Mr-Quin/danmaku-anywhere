import { Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { Suspense, use } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { db } from '@/common/db/db'
import { Logger } from '@/common/services/Logger'

const LoadInitialData = ({ children }: PropsWithChildren) => {
  use(db.isReady)

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
