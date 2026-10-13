import { describe, expect, it } from 'vitest'
import { hasExplicitRoute, resolveRestoreTarget } from './resolveRestoreTarget'
import { POPUP_DEFAULT_ROUTE, routes } from './router'

/**
 * Covers which route a reopened popup goes back to. Plain routes restore as
 * stored, routes whose page needs in-memory state restore to their parent,
 * unknown routes are reported invalid, and a popup opened at an explicit hash
 * route is never redirected.
 */

function resolve(persisted: unknown) {
  return resolveRestoreTarget(persisted, routes, POPUP_DEFAULT_ROUTE)
}

describe('resolveRestoreTarget', () => {
  it('restores a plain route as stored', () => {
    expect(resolve('/options/advanced')).toEqual({
      kind: 'restore',
      path: '/options/advanced',
    })
  })

  it.each([
    ['/search/season', '/search'],
    ['/config/edit', '/config'],
    ['/config/add', '/config'],
    ['/config/integration-policy/edit', '/config/integration-policy'],
    ['/providers/editor', '/providers'],
  ])('restores %s to %s', (persisted, expected) => {
    expect(resolve(persisted)).toEqual({ kind: 'restore', path: expected })
  })

  it.each([
    undefined,
    '',
    '/',
    POPUP_DEFAULT_ROUTE,
    42,
  ])('restores nothing for %s', (persisted) => {
    expect(resolve(persisted)).toEqual({ kind: 'none' })
  })

  it('reports an unknown route as invalid', () => {
    expect(resolve('/this/does/not/exist')).toEqual({ kind: 'invalid' })
  })
})

describe('hasExplicitRoute', () => {
  it.each(['', '#', '#/'])('treats %j as no route', (hash) => {
    expect(hasExplicitRoute(hash)).toBe(false)
  })

  it.each([
    '#/options/help',
    '#/mount',
    '#/search/season',
  ])('treats %s as an explicit route', (hash) => {
    expect(hasExplicitRoute(hash)).toBe(true)
  })
})
