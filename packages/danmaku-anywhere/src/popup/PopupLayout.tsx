import { Backdrop, CircularProgress, Container, Paper } from '@mui/material'
import { useLiveQuery } from 'dexie-react-hooks'
import { PropsWithChildren, useEffect } from 'react'

import { useStore } from './store'

import { db } from '@/common/db/db'
import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'
import { getActiveTab } from '@/common/utils'

export const PopupWrapper = ({ children }: PropsWithChildren) => {
  const isDbReady = useLiveQuery(() => db.isReady, [])
  const isLoading = useStore((state) => state.isLoading)
  const { isLoading: isOptionsLoading } = useExtensionOptions()

  useEffect(() => {
    useStore.setState({ isLoading: true })

    getActiveTab().then((tab) => {
      if (!tab.url) throw new Error('No active tab')
      useStore.setState({ tabUrl: tab.url, isLoading: false })
    })
  }, [])

  return (
    <Container
      sx={{
        padding: 0,
        width: 400,
        maxWidth: 400,
        height: 600,
        maxHeight: 600,
        overflow: 'hidden',
      }}
      fixed
    >
      <Backdrop
        open={!isDbReady || isLoading || isOptionsLoading}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <CircularProgress />
      </Backdrop>
      <Paper
        sx={{
          height: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </Paper>
    </Container>
  )
}
