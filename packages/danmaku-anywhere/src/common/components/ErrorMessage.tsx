import { Center } from '@/common/components/Center'
import { Typography } from '@mui/material'

type ErrorMessageProps = {
  message: string
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <Center>
      <Typography>There was an error!</Typography>
      <Typography color="error">{message}</Typography>
    </Center>
  )
}
