import type { PropsWithChildren } from 'react'
import { Suspense, use } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

import { Logger } from '@/common/Logger'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { Toast } from '@/common/components/Toast/Toast'
import { usePreloadImages } from '@/common/components/image/PreloadImages'
import { db } from '@/common/db/db'

const LoadInitialData = ({ children }: PropsWithChildren) => {
  use(db.isReady)

  return children
}

export const App = () => {
  usePreloadImages()

  return (
    <PopupLayout>
      <ErrorBoundary
        onError={Logger.error}
        fallbackRender={({ error }) => {
          return <ErrorMessage message={error.message} />
        }}
      >
        <Suspense fallback={<FullPageSpinner />}>
          <LoadInitialData>
            <Toast
              snackbarProps={{
                anchorOrigin: {
                  vertical: 'top',
                  horizontal: 'center',
                },
              }}
            />
            <RootRouter />
          </LoadInitialData>
        </Suspense>
      </ErrorBoundary>
    </PopupLayout>
  )
}
