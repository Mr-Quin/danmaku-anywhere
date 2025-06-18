import {
  GlobalStyles,
  StyledEngineProvider,
  ThemeProvider,
  createTheme,
} from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <StyledEngineProvider enableCssLayer>
        <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
        <ThemeProvider
          theme={createTheme({
            palette: {
              mode: 'dark',
            },
          })}
        >
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  </React.StrictMode>
)
