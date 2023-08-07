import React from 'react'
import ReactDOM from 'react-dom/client'
import { DanmakuDbProvider } from '@/common/indexedDb/IndexedDbContext'
import { Theme } from '@/common/style/Theme'
import { Options } from '@/options/Options'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <DanmakuDbProvider>
        <Options />
      </DanmakuDbProvider>
    </Theme>
  </React.StrictMode>
)
