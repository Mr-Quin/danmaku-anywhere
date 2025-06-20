export const utils = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const randomFrom = <T>(list: T[]): T => {
  const len = list.length
  const i = Math.floor(Math.random() * len)
  return list[i]
}

// Sorts an array of objects based on a specified order array
export const sortArrayByOrder = <T>(
  items: T[],
  order: string[] | undefined | null,
  keyAccessor: (item: T) => string
): T[] => {
  // shallow copy to avoid mutating the original array
  const itemsCopy = [...items]

  // fall back when order is not provided
  if (!order) {
    return itemsCopy.sort((a, b) =>
      keyAccessor(a).localeCompare(keyAccessor(b))
    )
  }

  // lookup map
  const orderMap = new Map(order.map((name, index) => [name, index]))

  return itemsCopy.sort((a, b) => {
    const keyA = keyAccessor(a)
    const keyB = keyAccessor(b)
    const indexA = orderMap.get(keyA)
    const indexB = orderMap.get(keyB)

    // if both items are in the order list, sort by their index
    if (indexA !== undefined && indexB !== undefined) return indexA - indexB
    // if only A is in the list, it comes first
    if (indexA !== undefined) return -1
    // if only B is in the list, it comes first
    if (indexB !== undefined) return 1
    // fallback
    return keyA.localeCompare(keyB)
  })
}
