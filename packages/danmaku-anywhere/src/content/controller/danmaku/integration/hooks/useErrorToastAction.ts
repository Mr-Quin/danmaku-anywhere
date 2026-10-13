import { useEventCallback } from '@mui/material'
import type { ToastOptions } from '@/common/components/Toast/toastStore'
import type { ErrorAction } from '@/common/errors/describeError'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

type ToastAction = Pick<ToastOptions, 'actionFn' | 'actionLabel'>

export function useErrorToastAction() {
  const { open } = usePopup()

  return useEventCallback((action: ErrorAction | undefined): ToastAction => {
    if (action === undefined) {
      return {}
    }
    switch (action.kind) {
      case 'openSearch':
        return {
          actionFn: () => open({ tab: PopupTab.Search }),
          actionLabel: action.label,
        }
    }
  })
}
