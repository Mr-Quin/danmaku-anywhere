import { useEffect } from 'react'

import { usePopup } from '../../../store/popupStore'

export const useCloseOnEsc = () => {
  // Close popup when press ESC
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        usePopup.setState({ isOpen: false })
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [])
}
