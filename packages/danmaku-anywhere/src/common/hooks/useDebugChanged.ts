import { useEffect } from 'react'

export function useDebugChanged(name: string, dependencies: unknown[]) {
  if (import.meta.env.DEV) {
    useEffect(() => {
      console.debug('[Debug][useDebugChanged]', name, dependencies)
    }, dependencies)
  }
}
