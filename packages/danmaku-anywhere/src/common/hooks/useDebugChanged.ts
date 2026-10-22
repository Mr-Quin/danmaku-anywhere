import { useEffect } from 'react'

export function useDebugChanged(name: string, dependencies: unknown[]) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[Debug][useDebugChanged]', name, dependencies)
    }
  }, dependencies)
}
