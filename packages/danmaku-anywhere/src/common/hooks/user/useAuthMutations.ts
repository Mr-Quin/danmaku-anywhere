import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuthSignInInput, AuthSignUpInput } from '@/common/auth/types'
import { authQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const useInvalidateUserSession = () => {
  const queryClient = useQueryClient()

  return () => {
    return queryClient.invalidateQueries({ queryKey: authQueryKeys.all() })
  }
}

export const useSignInMutation = () => {
  const invalidateSession = useInvalidateUserSession()

  return useMutation({
    mutationFn: async (
      data: Omit<Extract<AuthSignInInput, { provider: 'email' }>, 'provider'>
    ) => {
      const res = await chromeRpcClient.authSignIn(
        {
          provider: 'email',
          ...data,
        },
        { silent: true }
      )
      return res.data
    },
    onSuccess: (result) => {
      if (result.state === 'success') {
        invalidateSession()
      }
    },
  })
}

export const useSignUpMutation = () => {
  const invalidateSession = useInvalidateUserSession()

  return useMutation({
    mutationFn: async (data: Omit<AuthSignUpInput, 'provider'>) => {
      const res = await chromeRpcClient.authSignUp(
        {
          provider: 'email',
          ...data,
        },
        { silent: true }
      )
      return res.data
    },
    onSuccess: (result) => {
      if (result.state === 'success') {
        invalidateSession()
      }
    },
  })
}

export const useSignOutMutation = () => {
  const invalidateSession = useInvalidateUserSession()

  return useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.authSignOut()
      return res.data
    },
    onSuccess: (result) => {
      if (result.state === 'success') {
        invalidateSession()
      }
    },
  })
}

export const useDeleteAccountMutation = () => {
  const invalidateSession = useInvalidateUserSession()

  return useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.authDeleteAccount()
      return res.data
    },
    onSuccess: (result) => {
      if (result.state === 'success') {
        invalidateSession()
      }
    },
  })
}
