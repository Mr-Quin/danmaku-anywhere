import { useLocation } from 'react-router'
import { FilterPageCore } from '@/common/components/DanmakuFilter/FilterPageCore'
import { useGoBack } from '@/popup/hooks/useGoBack'

export const FilterPage = () => {
  const { state } = useLocation()

  const goBack = useGoBack()

  const initialFilter = typeof state === 'string' ? state : undefined

  return (
    <FilterPageCore
      onGoBack={goBack}
      showBackButton={!!initialFilter}
      initialFilter={initialFilter}
    />
  )
}
