import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CircularProgress, Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useToast } from '@/common/components/Toast/toastStore'
import { useSignUpMutation } from '@/common/hooks/user/useAuthMutations'

const signUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type SignUpFormType = z.infer<typeof signUpSchema>

export const SignUpForm = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const { mutate, isPending } = useSignUpMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormType>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = (data: SignUpFormType) => {
    mutate(
      {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: (result) => {
          if (result.state === 'error') {
            toast.error(result.message)
          } else {
            toast.success(
              t('optionsPage.auth.signUpSuccess', 'Sign up successful')
            )
          }
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <TextField
          label={t('optionsPage.auth.name', 'Name')}
          fullWidth
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register('name')}
        />
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
        <TextField
          label={t('optionsPage.auth.confirmPassword', 'Confirm Password')}
          type="password"
          fullWidth
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
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
            t('optionsPage.auth.signUp', 'Sign Up')
          )}
        </Button>
      </Stack>
    </Box>
  )
}
