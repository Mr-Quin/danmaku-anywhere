import type { ServiceIdentifier } from 'inversify'
import { useMemo } from 'react'
import { uiContainer } from '../ioc/uiIoc'

export const useService = <T>(service: ServiceIdentifier<T>): T => {
  return useMemo(() => {
    return uiContainer.get(service)
  }, [])
}
