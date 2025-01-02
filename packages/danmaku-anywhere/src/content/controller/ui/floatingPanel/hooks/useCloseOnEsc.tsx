import { useHotkeys } from 'react-hotkeys-hook'

import { usePopup } from '@/content/controller/store/popupStore'

export const useCloseOnEsc = () => {
  // Close popup when press ESC
  useHotkeys('esc', () => {
    usePopup.setState({ isOpen: false })
  })
}
