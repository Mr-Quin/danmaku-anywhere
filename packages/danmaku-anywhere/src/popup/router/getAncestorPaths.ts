import { matchRoutes, type RouteObject } from 'react-router'

/**
 * Walk the URL hierarchy of `target` and return the intermediate paths that
 * resolve to real routes, excluding /mount (the initial popup entry) and the
 * target itself. Search and hash fragments are stripped before splitting so a
 * '/' inside a query (e.g. ?next=/foo) can't be mistaken for a path segment.
 *
 * Used by the popup route restore flow to PUSH each ancestor before the final
 * target so the in-page back button steps back through the URL tree.
 */
export function getAncestorPaths(
  target: string,
  routes: RouteObject[]
): string[] {
  const queryIdx = target.search(/[?#]/)
  const raw = queryIdx >= 0 ? target.slice(0, queryIdx) : target
  // Normalize trailing slash so '/a/b' and '/a/b/' identify the same route
  // and the target isn't mistaken for one of its own ancestors.
  const pathname = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  const segments = pathname.split('/').filter(Boolean)
  const paths: string[] = []
  let current = ''
  for (const seg of segments) {
    current += `/${seg}`
    if (current === pathname || current === '/mount') {
      continue
    }
    if (matchRoutes(routes, current)) {
      paths.push(current)
    }
  }
  return paths
}
