import { useCallback, useMemo, useState } from 'react'
import { LocalStorageService } from '@/common/storage/LocalStorageService'
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

export function usePersistedPosition(key: string, defaultOffset: DragOffset) {
  const storage = useMemo(() => new LocalStorageService<DragOffset>(key), [key])

  const [initialOffset] = useState<DragOffset>(() => {
    return readValidOffset(storage, defaultOffset)
  })

  const persistOffset = useCallback(
    (newOffset: DragOffset) => {
      storage.write(newOffset)
    },
    [storage]
  )

  return { initialOffset, persistOffset }
}
