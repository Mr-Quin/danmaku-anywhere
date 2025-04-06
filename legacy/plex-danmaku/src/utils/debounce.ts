export const debounce = <R, T extends (...args: any[]) => R>(
  func: T,
  wait: number,
  immediate = false
): T => {
  let timeout: number | null = null
  let result: R

  const debounced = (...args: any[]) => {
    const later = () => {
      timeout = null
      if (!immediate) result = func(...args)
    }
    const callNow = immediate && !timeout
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) result = func(...args)
    return result
  }

  return debounced as T
}
