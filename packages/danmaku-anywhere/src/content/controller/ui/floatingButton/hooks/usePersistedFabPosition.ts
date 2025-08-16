import { useCallback, useEffect, useMemo, useState } from 'react'

export interface Offset {
  x: number
  y: number
}

const STORAGE_KEY_PREFIX = 'danmaku-anywhere:floatingButtonOffset:'

const getDomainKey = () => {
  try {
    return window.location.hostname || 'unknown'
  } catch {
    return 'unknown'
  }
}

const readFromStorage = (defaultOffset: Offset): Offset => {
  try {
    const key = STORAGE_KEY_PREFIX + getDomainKey()
    const raw = window.localStorage.getItem(key)
    if (!raw) return defaultOffset
    const parsed = JSON.parse(raw) as Partial<Offset>
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

const writeToStorage = (offset: Offset) => {
  try {
    const key = STORAGE_KEY_PREFIX + getDomainKey()
    window.localStorage.setItem(key, JSON.stringify(offset))
  } catch {
    // ignore
  }
}

export const usePersistedFabPosition = (defaultOffset: Offset) => {
  const [offset, setOffset] = useState<Offset>(() => readFromStorage(defaultOffset))

  useEffect(() => {
    // ensure defaults are written once if missing
    writeToStorage(offset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragEnd = useCallback((newOffset: Offset) => {
    setOffset(newOffset)
    writeToStorage(newOffset)
  }, [])

  const initialOffset = useMemo<Offset>(() => offset, [offset])

  return { initialOffset, handleDragEnd }
}