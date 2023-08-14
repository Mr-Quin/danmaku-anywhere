import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { DanmakuDbProvider } from '@/common/indexedDb/IndexedDbContext'
import { queryClient } from '@/common/queryClient'
import { Theme } from '@/common/style/Theme'
import { Options } from '@/options/Options'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <DanmakuDbProvider>
          <Options />
        </DanmakuDbProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
)
