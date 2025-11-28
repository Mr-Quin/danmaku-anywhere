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
  confirmColor?: ButtonProps['color']
  dialogProps?: Omit<DialogProps, 'open' | 'onClose'>
  hideCancel?: boolean
  hideConfirm?: boolean
  closeOnError?: boolean
}

type DialogInput = Omit<DialogConfig, 'id'>

interface DialogState {
  dialogs: DialogConfig[]
  loadingIds: string[]
  open: (config: DialogInput) => string
  close: (id?: string) => void
  setLoading: (id: string, loading: boolean) => void
  confirm: (config: DialogInput) => string
  delete: (config: DialogInput) => string
}

const generateId = () => Math.random().toString(36).substring(7)

const useDialogStoreBase = create<DialogState>((set, get) => ({
  dialogs: [],
  loadingIds: [],
  open: (config) => {
    const id = generateId()
    set((state) => ({
      dialogs: [...state.dialogs, { ...config, id }],
    }))
    return id
  },
  close: (id) => {
    set((state) => {
      if (id) {
        return {
          dialogs: state.dialogs.filter((d) => d.id !== id),
          loadingIds: state.loadingIds.filter((loadingId) => loadingId !== id),
        }
      }
      // Close the last one if no ID provided
      if (state.dialogs.length === 0) return state
      const lastId = state.dialogs[state.dialogs.length - 1].id
      return {
        dialogs: state.dialogs.slice(0, -1),
        loadingIds: state.loadingIds.filter(
          (loadingId) => loadingId !== lastId
        ),
      }
    })
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
      confirmColor: 'primary',
      ...config,
    })
  },
  delete: (config) => {
    return get().open({
      confirmColor: 'error',
      ...config,
    })
  },
}))

export const useDialogStore = createSelectors(useDialogStoreBase)

export const useDialog = () => {
  const open = useDialogStore.use.open()
  const close = useDialogStore.use.close()
  const confirm = useDialogStore.use.confirm()
  const deleteDialog = useDialogStore.use.delete()

  return {
    open,
    close,
    confirm,
    delete: deleteDialog,
  }
}
