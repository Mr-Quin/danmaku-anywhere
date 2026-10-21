import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { injectFonts } from '@/common/fonts'
import { queryClient } from '@/common/queries/queryClient'
import { Theme } from '@/common/theme/Theme'
import { App } from './App'
import '@/common/localization/i18n'
import { EnvironmentContext } from '@/common/environment/context'
import {
  bootstrapUiLanguage,
  requestOptionsUpgrade,
  uiContainer,
} from '@/common/ioc/uiIoc'
import { PopupReadinessGate } from './component/PopupReadinessGate'

const bootstrap = () => {
  bootstrapUiLanguage(uiContainer)
  requestOptionsUpgrade(uiContainer)

  injectFonts(document.head)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <EnvironmentContext
          value={{
            environment: import.meta.env.MODE,
            type: 'popup',
          }}
        >
          <PopupReadinessGate>
            <Theme>
              <App />
              <ReactQueryDevtools />
            </Theme>
          </PopupReadinessGate>
        </EnvironmentContext>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

bootstrap()
