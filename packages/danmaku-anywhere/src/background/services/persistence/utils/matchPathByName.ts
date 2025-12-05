import { stripExtension } from '@/common/utils/stripExtension'

// check if the name matches the string. If the string is a path, it will match the last part, with or without extension
export function matchPathByName(name: string, path: string): boolean {
  const lastPart = path.split('/').pop()

  if (!lastPart) {
    return false
  }

  return stripExtension(name) === stripExtension(lastPart)
}
