import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { getAncestorPaths } from './getAncestorPaths'
import { POPUP_DEFAULT_ROUTE, routes as popupRoutes } from './router'

/**
 * Verifies getAncestorPaths walks a URL hierarchy and returns intermediate
 * paths that resolve to real routes. Covers single and multi-level depth,
 * the alreadyInHistory and target exclusions, search/hash stripping, query
 * strings containing '/', unmatched intermediate segments, trailing slash
 * normalization, and the real popup route table.
 */

const fixtureRoutes: RouteObject[] = [
  {
    path: '/',
    children: [
      { path: 'mount', Component: () => null },
      {
        path: 'a',
        Component: () => null,
        children: [
          { path: 'b', Component: () => null },
          {
            path: 'nested',
            Component: () => null,
            children: [{ path: 'deep', Component: () => null }],
          },
        ],
      },
      { path: 'c', Component: () => null },
    ],
  },
]

const walk = (target: string, routes = fixtureRoutes) =>
  getAncestorPaths(target, routes, '/mount')

describe('getAncestorPaths', () => {
  it('returns [] for a top-level route (no ancestors)', () => {
    expect(walk('/a')).toEqual([])
  })

  it('returns the parent for a two-level route', () => {
    expect(walk('/a/b')).toEqual(['/a'])
  })

  it('returns the chain for a three-level route', () => {
    expect(walk('/a/nested/deep')).toEqual(['/a', '/a/nested'])
  })

  it('excludes the alreadyInHistory path from the chain', () => {
    expect(walk('/mount')).toEqual([])
  })

  it('strips query string before walking segments', () => {
    expect(walk('/a/b?from=settings')).toEqual(['/a'])
  })

  it('strips hash fragment before walking segments', () => {
    expect(walk('/a/b#anchor')).toEqual(['/a'])
  })

  it('strips both query and hash', () => {
    expect(walk('/a/b?x=1#y')).toEqual(['/a'])
  })

  it('does not split on / inside a query string', () => {
    expect(walk('/a/b?next=/c/d')).toEqual(['/a'])
  })

  it('skips intermediate segments that do not resolve to routes', () => {
    expect(walk('/a/ghost/b')).toEqual(['/a'])
  })

  it('returns [] for the root path', () => {
    expect(walk('/')).toEqual([])
  })

  it('normalizes trailing slashes', () => {
    expect(walk('/a/b/')).toEqual(['/a'])
  })

  it('walks /options/advanced against the real popup routes', () => {
    expect(
      getAncestorPaths('/options/advanced', popupRoutes, POPUP_DEFAULT_ROUTE)
    ).toEqual(['/options'])
  })

  it('walks /config/integration-policy/edit against the real popup routes', () => {
    expect(
      getAncestorPaths(
        '/config/integration-policy/edit',
        popupRoutes,
        POPUP_DEFAULT_ROUTE
      )
    ).toEqual(['/config', '/config/integration-policy'])
  })

  it('returns [] for /styles against the real popup routes', () => {
    expect(
      getAncestorPaths('/styles', popupRoutes, POPUP_DEFAULT_ROUTE)
    ).toEqual([])
  })
})
