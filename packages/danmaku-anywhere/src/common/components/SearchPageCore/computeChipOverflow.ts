interface ComputeChipOverflowArgs<T> {
  items: T[]
  activeId: string
  widths: Record<string, number>
  containerWidth: number
  overflowWidth: number
  gap: number
}

export interface ChipOverflowLayout<T> {
  visible: T[]
  overflow: T[]
}

function fitCount(widths: number[], available: number, gap: number): number {
  let used = 0
  let count = 0
  for (const width of widths) {
    const next = count > 0 ? used + gap + width : width
    if (next > available) {
      break
    }
    used = next
    count += 1
  }
  return count
}

/**
 * If the active chip lands in the overflow set, it is swapped into the last
 * visible slot so the current selection is always shown.
 */
export function computeChipOverflow<T extends { id: string }>({
  items,
  activeId,
  widths,
  containerWidth,
  overflowWidth,
  gap,
}: ComputeChipOverflowArgs<T>): ChipOverflowLayout<T> {
  if (items.length === 0) {
    return { visible: [], overflow: [] }
  }

  const hasAllWidths = items.every((item) => widths[item.id] !== undefined)
  if (!containerWidth || !hasAllWidths) {
    return { visible: items, overflow: [] }
  }

  const totalWidth = items.reduce(
    (sum, item, index) => sum + widths[item.id] + (index > 0 ? gap : 0),
    0
  )
  if (totalWidth <= containerWidth) {
    return { visible: items, overflow: [] }
  }

  const reserved = overflowWidth + gap
  const naturalCount = fitCount(
    items.map((item) => widths[item.id]),
    containerWidth - reserved,
    gap
  )

  const activeIndex = items.findIndex((item) => item.id === activeId)
  if (activeIndex === -1 || activeIndex < naturalCount) {
    return {
      visible: items.slice(0, naturalCount),
      overflow: items.slice(naturalCount),
    }
  }

  const activeItem = items[activeIndex]
  const leading = items.filter((item) => item.id !== activeId)
  const leadAvailable = containerWidth - reserved - widths[activeId] - gap
  const leadCount = fitCount(
    leading.map((item) => widths[item.id]),
    leadAvailable,
    gap
  )
  return {
    visible: [...leading.slice(0, leadCount), activeItem],
    overflow: leading.slice(leadCount),
  }
}
