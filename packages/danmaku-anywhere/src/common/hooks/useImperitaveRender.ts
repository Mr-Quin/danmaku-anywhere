import { useCallback, useState } from 'react'

// force rerender
export const useImperitaveRender = () => {
  const [, setTick] = useState(0)
  return useCallback(() => {
    setTick((tick) => tick ^ 1)
  }, [])
}
