import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { injectFonts } from '@/common/fonts'
import { queryClient } from '@/common/queries/queryClient'
import { ensureStandaloneReady } from '@/common/standalone/ensureStandaloneReady'
import { Theme } from '@/common/theme/Theme'
import { App } from './App'
import '@/common/localization/i18n'
import { EnvironmentContext } from '@/common/environment/context'
import { hydratePopupHash } from './router/persistRoute'
import { routes } from './router/router'

const bootstrap = async () => {
  await ensureStandaloneReady()
  await hydratePopupHash(routes)

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
          <Theme>
            <App />
            <ReactQueryDevtools />
          </Theme>
        </EnvironmentContext>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

void bootstrap()
