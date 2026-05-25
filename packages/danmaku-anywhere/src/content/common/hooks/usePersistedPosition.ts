import { useCallback, useMemo, useState } from 'react'
import { LocalStorageService } from '@/common/storage/LocalStorageService'
import {
  clampOffset,
  type OffsetBounds,
} from '@/content/common/hooks/clampOffset'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

function readValidOffset(
  storage: LocalStorageService<DragOffset>,
  defaultOffset: DragOffset
): DragOffset {
  const parsed = storage.read()
  if (
    parsed &&
    typeof parsed.x === 'number' &&
    Number.isFinite(parsed.x) &&
    typeof parsed.y === 'number' &&
    Number.isFinite(parsed.y)
  ) {
    return { x: parsed.x, y: parsed.y }
  }
  return defaultOffset
}

interface UsePersistedPositionOptions {
  bounds?: OffsetBounds
}

export function usePersistedPosition(
  key: string,
  defaultOffset: DragOffset,
  options: UsePersistedPositionOptions = {}
) {
  const { bounds } = options
  const storage = useMemo(() => new LocalStorageService<DragOffset>(key), [key])

  const [initialOffset] = useState<DragOffset>(() => {
    return clampOffset(readValidOffset(storage, defaultOffset), bounds)
  })

  const persistOffset = useCallback(
    (newOffset: DragOffset) => {
      storage.write(clampOffset(newOffset, bounds))
    },
    [storage, bounds]
  )

  return { initialOffset, persistOffset }
}
