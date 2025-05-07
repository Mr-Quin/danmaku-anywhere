import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { Typography } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

type NothingHereProps = {
  message?: string
  size?: number
}

export const NothingHere = ({ message, size = 150 }: NothingHereProps) => {
  const { t } = useTranslation()

  return (
    <Center>
      <Typography>{message ?? t('common.itsEmpty')}</Typography>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage src="/danmaku_empty.png" width={size} height={size} />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
