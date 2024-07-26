import type { SlideProps } from '@mui/material'
import { Paper, Slide } from '@mui/material'
import { type PropsWithChildren, Suspense } from 'react'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'

type OptionsPageProps = PropsWithChildren<{
  direction?: SlideProps['direction']
}>

export const OptionsPageLayout = ({
  children,
  direction = 'up',
}: OptionsPageProps) => {
  return (
    <Slide direction={direction} in mountOnEnter unmountOnExit>
      <Paper
        sx={{
          position: 'absolute',
          top: 0,
          zIndex: 1,
          width: 1,
          height: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
      </Paper>
    </Slide>
  )
}
