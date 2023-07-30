import { useMemo } from 'react'

export const useConst = <T>(value: T) => {
  return useMemo(() => value, [])
}
