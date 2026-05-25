import { useCallback } from 'react'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { usePersistedPosition } from '@/content/common/hooks/usePersistedPosition'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

export function usePersistedFabPosition(defaultOffset: DragOffset) {
  const { initialOffset, persistOffset } = usePersistedPosition(
    'fabOffset',
    defaultOffset
  )

  const handleDragEnd = useCallback(
    (newOffset: DragOffset) => {
      persistOffset(newOffset)
      getTrackingService().track('dragFabEnd', newOffset)
    },
    [persistOffset]
  )

  return { initialOffset, handleDragEnd }
}
