import { type PropsWithChildren, Suspense, use } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePreloadImages } from '@/common/components/image/usePreloadImages'
import { Toast } from '@/common/components/Toast/Toast'
import { db } from '@/common/db/db'
import { useSetupClarity } from '@/common/hooks/useSetupClarity'
import { useSetupTracking } from '@/common/hooks/useSetupTracking'
import { Logger } from '@/common/Logger'
import { useThemeContext } from '@/common/theme/Theme'
import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

const LoadInitialData = ({ children }: PropsWithChildren) => {
  use(db.isReady)

  return children
}

export const App = () => {
  usePreloadImages()
  useSetupClarity(import.meta.env.VITE_CLARITY_PROJECT_ID_POPUP)
  useSetupTracking()

  const { colorScheme } = useThemeContext()

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
            <meta name="color-scheme" content={colorScheme} />
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
