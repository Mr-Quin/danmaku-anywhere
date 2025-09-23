export const utils = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const randomFrom = <T>(list: T[]): T => {
  const len = list.length
  const i = Math.floor(Math.random() * len)
  return list[i]
}

// Natural sorting function that handles numeric components in strings
// Particularly useful for episode names like "第01集", "第10集", "第100集"
export const naturalSort = (a: string, b: string): number => {
  // Split strings into chunks of letters and numbers
  const splitPattern = /(\d+|\D+)/g
  const aParts = a.match(splitPattern) || []
  const bParts = b.match(splitPattern) || []

  const maxLength = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''

    // Check if both parts are numeric
    const aIsNum = /^\d+$/.test(aPart)
    const bIsNum = /^\d+$/.test(bPart)

    if (aIsNum && bIsNum) {
      // Compare as numbers
      const aNum = Number.parseInt(aPart, 10)
      const bNum = Number.parseInt(bPart, 10)
      if (aNum !== bNum) {
        return aNum - bNum
      }
    } else {
      // Compare as strings
      const comparison = aPart.localeCompare(bPart)
      if (comparison !== 0) {
        return comparison
      }
    }
  }

  return 0
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
