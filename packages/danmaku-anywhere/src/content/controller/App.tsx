import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, useEffect, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HotkeysProvider } from 'react-hotkeys-hook'

import { Content } from './Content'
import { LoadInitialData } from './LoadInitialData'

import { Logger } from '@/common/Logger'
import { usePreloadImages } from '@/common/components/image/usePreloadImages'

export const App = () => {
  usePreloadImages()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  useEffect(() => {
    if (ref.current?.state.didCatch) {
      ref.current.resetErrorBoundary()
    }
  }, [])

  return (
    <ErrorBoundary
      onReset={reset}
      ref={ref}
      fallback={null}
      onError={(error, info) => {
        Logger.error(error)
        Logger.error(info)
      }}
    >
      <Suspense fallback={null}>
        <LoadInitialData>
          <HotkeysProvider>
            <Content />
          </HotkeysProvider>
        </LoadInitialData>
      </Suspense>
    </ErrorBoundary>
  )
}
