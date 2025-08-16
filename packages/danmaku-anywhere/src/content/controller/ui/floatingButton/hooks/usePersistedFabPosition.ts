import { useCallback, useEffect, useMemo, useState } from 'react'

export interface FabOffset {
  x: number
  y: number
}

const STORAGE_KEY_PREFIX = 'danmaku-anywhere:floatingButtonOffset'

const readFromStorage = (defaultOffset: FabOffset): FabOffset => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX)
    if (!raw) return defaultOffset
    const parsed = JSON.parse(raw) as Partial<FabOffset>
    if (
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y }
    }
    return defaultOffset
  } catch {
    return defaultOffset
  }
}

const writeToStorage = (offset: FabOffset) => {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(offset))
  } catch {
    // ignore
  }
}

export const usePersistedFabPosition = (defaultOffset: FabOffset) => {
  const [offset, setOffset] = useState<FabOffset>(() =>
    readFromStorage(defaultOffset)
  )

  useEffect(() => {
    writeToStorage(offset)
  }, [])

  const handleDragEnd = useCallback((newOffset: FabOffset) => {
    setOffset(newOffset)
    writeToStorage(newOffset)
  }, [])

  const initialOffset = useMemo<FabOffset>(() => offset, [offset])

  return { initialOffset, handleDragEnd }
}
