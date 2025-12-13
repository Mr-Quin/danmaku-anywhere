import type { ReactNode } from 'react'

export type DAMenuItemConfig =
  | {
      kind?: 'item'
      icon: ReactNode
      label: string
      id: string
      onClick: () => void
      disabled?: boolean
      tooltip?: ReactNode
      loading?: boolean
      color?: string
    }
  | {
      kind: 'separator'
      id: string
    }
