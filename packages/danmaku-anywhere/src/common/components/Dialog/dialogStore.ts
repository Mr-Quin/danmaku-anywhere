import type { ButtonProps, DialogProps } from '@mui/material'
import type { ReactNode } from 'react'
import { create } from 'zustand'
import { createSelectors } from '@/common/utils/createSelectors'

export interface DialogConfig {
  id: string
  title?: ReactNode
  content?: ReactNode
  confirmText?: ReactNode
  cancelText?: ReactNode
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  confirmButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  dialogProps?: Omit<DialogProps, 'open' | 'onClose'>
  hideCancel?: boolean
  hideConfirm?: boolean
  // the x button on the top right
  showCloseButton?: boolean
  closeOnError?: boolean
  container?: HTMLElement | null
}

type DialogInput = Omit<DialogConfig, 'id'>

interface DialogState {
  dialogs: DialogConfig[]
  loadingIds: string[]
  closingIds: string[]
  container: HTMLElement | null
  open: (config: DialogInput) => string
  close: (id?: string) => void
  remove: (id: string) => void
  setLoading: (id: string, loading: boolean) => void
  confirm: (config: DialogInput) => string
  delete: (config: DialogInput) => string
  setContainer: (container: HTMLElement | null) => void
}

let dialogIdCounter = 0
function generateId() {
  return `dialog-${Date.now()}-${dialogIdCounter++}`
}

const useDialogStoreBase = create<DialogState>((set, get) => ({
  dialogs: [],
  loadingIds: [],
  closingIds: [],
  container: null,
  open: (config) => {
    const id = generateId()
    set((state) => ({
      dialogs: [...state.dialogs, { ...config, id }],
    }))
    return id
  },
  close: (id) => {
    set((state) => {
      const targetId =
        id ||
        (state.dialogs.length > 0
          ? state.dialogs[state.dialogs.length - 1].id
          : null)

      if (!targetId) return state

      if (state.closingIds.includes(targetId)) {
        return state
      }

      return {
        closingIds: [...state.closingIds, targetId],
      }
    })
  },
  remove: (id) => {
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.id !== id),
      loadingIds: state.loadingIds.filter((loadingId) => loadingId !== id),
      closingIds: state.closingIds.filter((closingId) => closingId !== id),
    }))
  },
  setLoading: (id, loading) => {
    set((state) => ({
      loadingIds: loading
        ? [...state.loadingIds, id]
        : state.loadingIds.filter((loadingId) => loadingId !== id),
    }))
  },
  confirm: (config) => {
    return get().open({
      confirmButtonProps: {
        color: 'primary',
        variant: 'contained',
        ...config.confirmButtonProps,
      },
      ...config,
    })
  },
  delete: (config) => {
    return get().open({
      confirmButtonProps: {
        color: 'error',
        variant: 'contained',
        ...config.confirmButtonProps,
      },
      ...config,
    })
  },
  setContainer: (container) => set({ container }),
}))

export const useDialogStore = createSelectors(useDialogStoreBase)

export const useDialog = () => {
  const open = useDialogStore.use.open()
  const close = useDialogStore.use.close()
  const confirm = useDialogStore.use.confirm()
  const deleteDialog = useDialogStore.use.delete()
  const setContainer = useDialogStore.use.setContainer()

  return {
    open,
    close,
    confirm,
    delete: deleteDialog,
    setContainer,
  }
}
