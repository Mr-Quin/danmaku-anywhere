import { matchRoutes, type RouteObject } from 'react-router'

/**
 * Return route-resolving ancestors of `target`, excluding `alreadyInHistory`
 * (would dupe the current entry) and the target itself. Search/hash are
 * stripped and trailing slashes normalized before walking.
 */
export function getAncestorPaths(
  target: string,
  routes: RouteObject[],
  alreadyInHistory: string
): string[] {
  const queryIdx = target.search(/[?#]/)
  const raw = queryIdx >= 0 ? target.slice(0, queryIdx) : target
  const pathname = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  const segments = pathname.split('/').filter(Boolean)
  const paths: string[] = []
  let current = ''
  for (const seg of segments) {
    current += `/${seg}`
    if (current === pathname || current === alreadyInHistory) {
      continue
    }
    if (matchRoutes(routes, current)) {
      paths.push(current)
    }
  }
  return paths
}
