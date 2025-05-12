import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { images } from '@/common/components/image/usePreloadImages'
import { Typography } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

type ErrorMessageProps = {
  message: string
  size?: number
}

export const ErrorMessage = ({ message, size = 200 }: ErrorMessageProps) => {
  const { t } = useTranslation()

  return (
    <Center>
      <Typography>{t('error.unknown')}</Typography>
      <Typography color="error">{message}</Typography>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage src={images.Apologize} width={size} height={size} />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
