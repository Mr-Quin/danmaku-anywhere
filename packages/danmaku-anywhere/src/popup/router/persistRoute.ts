import {
  type createHashRouter,
  matchRoutes,
  type RouteObject,
} from 'react-router'
import { Logger } from '@/common/Logger'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { tryCatch } from '@/common/utils/tryCatch'

export const STORAGE_KEY = 'popup:lastRoute'

type PopupRouter = ReturnType<typeof createHashRouter>

function getSessionStorage() {
  return getStorageArea('session')
}

function getCurrentHashPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  return raw === '' ? '/' : raw
}

export async function hydratePopupHash(routes: RouteObject[]): Promise<void> {
  if (getCurrentHashPath() !== '/') {
    return
  }

  const storage = getSessionStorage()
  const [data, err] = await tryCatch(() => storage.get(STORAGE_KEY))
  if (err || !data) {
    return
  }

  const persisted = data[STORAGE_KEY]
  if (typeof persisted !== 'string' || persisted === '' || persisted === '/') {
    return
  }

  if (!matchRoutes(routes, persisted)) {
    void tryCatch(async () => storage.remove(STORAGE_KEY)).then(([, err]) => {
      if (err) {
        Logger.error('Failed to clear stale popup route', err)
      }
    })
    return
  }

  history.replaceState(null, '', `#${persisted}`)
}

export function setupRoutePersistence(router: PopupRouter): () => void {
  const storage = getSessionStorage()
  let lastWritten: string | undefined

  const unsubscribe = router.subscribe((state) => {
    if (state.navigation.state !== 'idle') {
      return
    }
    const { pathname, search, hash } = state.location
    const path = `${pathname}${search}${hash}`
    if (path === lastWritten) {
      return
    }
    lastWritten = path
    void tryCatch(async () => storage.set({ [STORAGE_KEY]: path })).then(
      ([, err]) => {
        if (err) {
          Logger.error('Failed to persist popup route', err)
        }
      }
    )
  })

  return unsubscribe
}
