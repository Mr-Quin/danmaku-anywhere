import { useMemo } from 'react'

import { useXPathPolicyStore } from '@/common/options/xpathPolicyStore/useXPathPolicyStore'

export const useMatchXPathPolicy = (id?: string) => {
  const { get } = useXPathPolicyStore()

  return useMemo(() => {
    if (!id) return
    return get(id)
  }, [id, get])
}
