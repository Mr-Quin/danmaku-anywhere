import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, useEffect, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HotkeysProvider } from 'react-hotkeys-hook'
import { usePreloadImages } from '@/common/components/image/usePreloadImages'
import { useSetupClarity } from '@/common/hooks/useSetupClarity'
import { Logger } from '@/common/Logger'
import { usePort } from '@/content/controller/common/hooks/usePort'
import { Content } from './Content'
import { LoadInitialData } from './LoadInitialData'

export const App = () => {
  usePreloadImages()
  useSetupClarity(import.meta.env.VITE_CLARITY_PROJECT_ID_CONTENT)
  usePort()

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
