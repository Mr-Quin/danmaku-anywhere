import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { getAncestorPaths } from './getAncestorPaths'
import { routes as popupRoutes } from './router'

/**
 * Verifies getAncestorPaths walks a URL hierarchy and returns intermediate
 * paths that resolve to real routes. Covers single and multi-level depth,
 * /mount and target exclusion, search/hash stripping, unmatched intermediate
 * segments, and the real popup route table.
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

describe('getAncestorPaths', () => {
  it('returns [] for a top-level route (no ancestors)', () => {
    expect(getAncestorPaths('/a', fixtureRoutes)).toEqual([])
  })

  it('returns the parent for a two-level route', () => {
    expect(getAncestorPaths('/a/b', fixtureRoutes)).toEqual(['/a'])
  })

  it('returns the chain for a three-level route', () => {
    expect(getAncestorPaths('/a/nested/deep', fixtureRoutes)).toEqual([
      '/a',
      '/a/nested',
    ])
  })

  it('excludes /mount from the chain', () => {
    expect(getAncestorPaths('/mount', fixtureRoutes)).toEqual([])
  })

  it('strips query string before walking segments', () => {
    expect(getAncestorPaths('/a/b?from=settings', fixtureRoutes)).toEqual([
      '/a',
    ])
  })

  it('strips hash fragment before walking segments', () => {
    expect(getAncestorPaths('/a/b#anchor', fixtureRoutes)).toEqual(['/a'])
  })

  it('strips both query and hash', () => {
    expect(getAncestorPaths('/a/b?x=1#y', fixtureRoutes)).toEqual(['/a'])
  })

  it('does not split on / inside a query string', () => {
    expect(getAncestorPaths('/a/b?next=/c/d', fixtureRoutes)).toEqual(['/a'])
  })

  it('skips intermediate segments that do not resolve to routes', () => {
    expect(getAncestorPaths('/a/ghost/b', fixtureRoutes)).toEqual(['/a'])
  })

  it('returns [] for the root path', () => {
    expect(getAncestorPaths('/', fixtureRoutes)).toEqual([])
  })

  it('handles trailing slashes via Boolean filter on segments', () => {
    expect(getAncestorPaths('/a/b/', fixtureRoutes)).toEqual(['/a'])
  })

  it('walks /options/advanced against the real popup routes', () => {
    expect(getAncestorPaths('/options/advanced', popupRoutes)).toEqual([
      '/options',
    ])
  })

  it('walks /config/integration-policy/edit against the real popup routes', () => {
    expect(
      getAncestorPaths('/config/integration-policy/edit', popupRoutes)
    ).toEqual(['/config', '/config/integration-policy'])
  })

  it('returns [] for /styles against the real popup routes', () => {
    expect(getAncestorPaths('/styles', popupRoutes)).toEqual([])
  })
})
