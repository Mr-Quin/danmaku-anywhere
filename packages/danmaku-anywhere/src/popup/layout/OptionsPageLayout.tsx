import type { SlideProps } from '@mui/material'
import { Box, Paper, Slide } from '@mui/material'
import { Suspense, type PropsWithChildren } from 'react'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'

type OptionsPageProps = PropsWithChildren<{
  direction?: SlideProps['direction']
}>

export const OptionsPageLayout = ({
  children,
  direction = 'left',
}: OptionsPageProps) => {
  return (
    <Box position="absolute" top={0} zIndex={1} width={1} overflow="auto">
      <Slide direction={direction} in mountOnEnter unmountOnExit>
        <Paper sx={{ height: '100vh' }}>
          <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
        </Paper>
      </Slide>
    </Box>
  )
}
