import { Typography } from '@mui/material'
import { type ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { images } from '@/common/components/image/usePreloadImages'

type ErrorMessageProps = {
  message: string
  showMessage?: boolean
  size?: number
  beforeContent?: ReactNode
}

export const ErrorMessage = ({
  message,
  showMessage = true,
  beforeContent,
  size = 300,
}: ErrorMessageProps) => {
  const { t } = useTranslation()

  return (
    <Center>
      {beforeContent}
      {showMessage ? (
        <>
          <Typography>{t('error.unknown')}</Typography>
          <Typography color="error">{message}</Typography>
        </>
      ) : null}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage
            src={images.Apologize}
            width={size}
            height={size}
            cache={false}
          />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
