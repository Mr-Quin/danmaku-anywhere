import type { SlideProps } from '@mui/material'
import { Paper, Slide, styled } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { Suspense } from 'react'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { getScrollBarProps } from '@/common/components/layout/ScrollBox'

const OptionsPageContainer = styled(Paper)(({ theme }) => {
  return {
    position: 'absolute',
    top: 0,
    zIndex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'auto',
    ...getScrollBarProps(theme),
  }
})

type OptionsPageProps = PropsWithChildren<{
  direction?: SlideProps['direction']
}>

export const OptionsPageLayout = ({
  children,
  direction = 'up',
}: OptionsPageProps) => {
  return (
    <Slide direction={direction} in mountOnEnter unmountOnExit>
      <OptionsPageContainer>
        <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
      </OptionsPageContainer>
    </Slide>
  )
}
