import { Center } from '@/common/components/Center'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { Typography } from '@mui/material'
import { Suspense } from 'react'

type ErrorMessageProps = {
  message: string
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <Center>
      <Typography>Something went wrong</Typography>
      <Typography color="error">{message}</Typography>
      <Suspense fallback={null}>
        <SuspenseImage src="/danmaku_apologize.png" width={200} height={200} />
      </Suspense>
    </Center>
  )
}
