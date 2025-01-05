import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, useEffect, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HotkeysProvider } from 'react-hotkeys-hook'

import { Content } from './Content'
import { LoadInitialData } from './LoadInitialData'

import { Logger } from '@/common/Logger'
import { useSwitchLanguage } from '@/content/controller/common/hooks/useSwitchLanguage'

export const App = () => {
  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()
  useSwitchLanguage()

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
