import { stripExtension } from '@/common/utils/stripExtension'

function compareExtension(a: string, b: string): boolean {
  const aWithoutExtension = stripExtension(a)
  const bWithoutExtension = stripExtension(b)
  return (
    a === bWithoutExtension ||
    aWithoutExtension === b ||
    aWithoutExtension === bWithoutExtension
  )
}

// check if the name matches the string. If the string is a path, it will match the last part, with or without extension
export function matchPathByName(name: string, path: string): boolean {
  if (!path.includes('/')) {
    if (name === path) {
      return true
    }
    return compareExtension(name, path)
  }

  const lastPart = path.split('/').pop()

  if (!lastPart) {
    return false
  }

  if (name === lastPart) {
    return true
  }

  return compareExtension(name, lastPart)
}
