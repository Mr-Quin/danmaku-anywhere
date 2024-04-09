import { ExpandLess, ExpandMore } from '@mui/icons-material'
import type { FabProps } from '@mui/material'
import { Fab, Zoom } from '@mui/material'
import { forwardRef } from 'react'

import { LoadingRing } from './components/LoadingRing'
import { useShowFab } from './hooks/useShowFab'

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'

interface FloatingButtonProps extends FabProps {
  onOpen: () => void
  isOpen: boolean
}

export const FloatingButton = forwardRef<
  HTMLButtonElement,
  FloatingButtonProps
>(({ onOpen, isOpen, ...rest }: FloatingButtonProps, passedRef) => {
  const isLoading = useAnyLoading()

  const [showFab, fabRef] = useShowFab()

  const ref = useMergeRefs<HTMLButtonElement>(fabRef, passedRef)

  return (
    <Zoom in={isLoading || showFab || isOpen}>
      <Fab
        color="primary"
        aria-label="Add"
        onClick={onOpen}
        ref={ref}
        {...rest}
      >
        <LoadingRing isLoading={isLoading} />
        {isOpen ? <ExpandMore /> : <ExpandLess />}
      </Fab>
    </Zoom>
  )
})

FloatingButton.displayName = 'FloatingButton'
