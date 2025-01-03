import { useCallback } from 'react'
import { useNavigate } from 'react-router'

export const useGoBack = () => {
  const navigate = useNavigate()

  return useCallback(() => {
    navigate(-1)
  }, [navigate])
}
