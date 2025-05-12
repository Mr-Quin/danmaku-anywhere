import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { images } from '@/common/components/image/usePreloadImages'
import { Typography } from '@mui/material'
import { type ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

type NothingHereProps = {
  message?: string
  size?: number
  children?: ReactNode
}

export const NothingHere = ({
  message,
  size = 150,
  children,
}: NothingHereProps) => {
  const { t } = useTranslation()

  return (
    <Center>
      <Typography>{message ?? t('common.itsEmpty')}</Typography>
      {children}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage src={images.Empty} width={size} height={size} />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
