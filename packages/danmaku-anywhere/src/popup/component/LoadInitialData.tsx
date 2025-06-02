import { Logger } from '@/common/Logger'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePreloadImages } from '@/common/components/image/usePreloadImages'
import { db } from '@/common/db/db'
import { type PropsWithChildren, Suspense, use } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

const LoadInitialDataSuspense = ({ children }: PropsWithChildren) => {
  use(db.isReady)
  usePreloadImages()

  return children
}

export const LoadInitialData = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundary
      onError={Logger.error}
      fallbackRender={({ error }) => {
        return <ErrorMessage message={error.message} />
      }}
    >
      <Suspense fallback={<FullPageSpinner />}>
        <LoadInitialDataSuspense>{children}</LoadInitialDataSuspense>
      </Suspense>
    </ErrorBoundary>
  )
}
