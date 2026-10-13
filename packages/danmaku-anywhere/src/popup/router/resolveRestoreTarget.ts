import { matchRoutes, type RouteObject } from 'react-router'

export interface PopupRouteHandle {
  // Where a reopened popup lands instead of this route. Set on routes whose
  // page reads state that does not outlive the popup.
  restoreTo?: string
}

export type RestoreTarget =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'restore'; path: string }

// A popup opened at a specific route (popup.html#/options, or a page reopened
// in its own tab) shows that route, not the one from the last session.
export function hasExplicitRoute(hash: string): boolean {
  return hash !== '' && hash !== '#' && hash !== '#/'
}

export function resolveRestoreTarget(
  persisted: unknown,
  routes: RouteObject[],
  defaultRoute: string
): RestoreTarget {
  if (
    typeof persisted !== 'string' ||
    persisted === '' ||
    persisted === '/' ||
    persisted === defaultRoute
  ) {
    return { kind: 'none' }
  }
  const matches = matchRoutes(routes, persisted)
  if (!matches) {
    return { kind: 'invalid' }
  }
  const handle = matches[matches.length - 1].route.handle as
    | PopupRouteHandle
    | undefined
  const path = handle?.restoreTo ?? persisted
  if (path === defaultRoute) {
    return { kind: 'none' }
  }
  return { kind: 'restore', path }
}
