import { Typography } from '@mui/material'
import { type ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { images } from '@/common/components/image/usePreloadImages'

type NothingHereProps = {
  message?: string
  size?: number
  children?: ReactNode
}

export const NothingHere = ({
  message,
  size = 300,
  children,
}: NothingHereProps) => {
  const { t } = useTranslation()

  return (
    <Center>
      <Typography>
        {message ?? t('common.itsEmpty', "There's nothing here...")}
      </Typography>
      {children}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage
            src={images.Empty}
            width={size}
            height={size}
            cache={false}
          />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
