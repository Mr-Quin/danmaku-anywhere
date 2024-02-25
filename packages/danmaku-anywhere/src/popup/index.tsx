import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { PopupWrapper } from './PopupLayout'
import { RootRouter } from './RootRouter'

import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <PopupWrapper>
          <RootRouter />
        </PopupWrapper>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
