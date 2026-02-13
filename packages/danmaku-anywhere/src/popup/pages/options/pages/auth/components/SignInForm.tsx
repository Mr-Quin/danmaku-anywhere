import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CircularProgress, Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useToast } from '@/common/components/Toast/toastStore'
import { useSignInMutation } from '@/common/hooks/user/useAuthMutations'

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
})

type SignInFormType = z.infer<typeof signInSchema>

export const SignInForm = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { mutate, isPending } = useSignInMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormType>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (data: SignInFormType) => {
    mutate(data, {
      onSuccess: (result) => {
        if (result.state === 'error') {
          toast.error(result.message)
        }
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <TextField
          label={t('optionsPage.auth.email', 'Email')}
          type="email"
          fullWidth
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={t('optionsPage.auth.password', 'Password')}
          type="password"
          fullWidth
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isPending}
        >
          {isPending ? (
            <CircularProgress size={24} />
          ) : (
            t('optionsPage.auth.signIn', 'Sign In')
          )}
        </Button>
      </Stack>
    </Box>
  )
}
