import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, useEffect, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Content } from './Content'

import { Logger } from '@/common/services/Logger'

export const App = () => {
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
        <Content />
      </Suspense>
    </ErrorBoundary>
  )
}
