import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { Typography } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

type ErrorMessageProps = {
  message: string
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <Center>
      <Typography>Something went wrong</Typography>
      <Typography color="error">{message}</Typography>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SuspenseImage
            src="/danmaku_apologize.png"
            width={200}
            height={200}
          />
        </Suspense>
      </ErrorBoundary>
    </Center>
  )
}
