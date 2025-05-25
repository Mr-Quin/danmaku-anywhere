import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { App } from '@/popup/App'

import { queryClient } from '@/common/queries/queryClient'
import { Theme } from '@/common/theme/Theme'
import '@/common/localization/i18n'
import { environment } from '@/popup/context/Environment'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <environment.Provider value={{ isPopup: false }}>
          <App />
        </environment.Provider>
        <ReactQueryDevtools />
      </Theme>
    </QueryClientProvider>
  </React.StrictMode>
)
