import { useEventCallback } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ToastOptions } from '@/common/components/Toast/toastStore'
import { AppError, type AppErrorCode } from '@/common/errors/AppError'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

type ToastAction = Pick<ToastOptions, 'actionFn' | 'actionLabel'>

const OFFERS_SEARCH: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'network',
  'http',
  'timeout',
  'hostNotAllowed',
  'source.removed',
  'source.unavailable',
  'source.searchUnsupported',
  'source.episodesUnsupported',
  'source.danmakuUnsupported',
  'source.noDanmaku',
  'badResponse',
])

// Picking another source from the search page is the way out of a failed
// source, and of anything unclassified.
export function offersSearch(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return true
  }
  return OFFERS_SEARCH.has(error.code)
}

export function useErrorToastAction() {
  const { t } = useTranslation()
  const { open } = usePopup()

  const openSearch = useEventCallback((): ToastAction => {
    return {
      actionFn: () => open({ tab: PopupTab.Search }),
      actionLabel: t('integration.alert.openSearch', 'Open search page'),
    }
  })

  const forError = useEventCallback((error: unknown): ToastAction => {
    if (!offersSearch(error)) {
      return {}
    }
    return openSearch()
  })

  return { forError, openSearch }
}
