import type { SlideProps } from '@mui/material'
import { Slide } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { Suspense } from 'react'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { OverlayLayout } from '@/common/components/layout/OverlayLayout'

type OptionsPageProps = PropsWithChildren<{
  direction?: SlideProps['direction']
}>

export const OptionsPageLayout = ({
  children,
  direction = 'up',
}: OptionsPageProps) => {
  return (
    <Slide direction={direction} in mountOnEnter unmountOnExit>
      <OverlayLayout>
        <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
      </OverlayLayout>
    </Slide>
  )
}
