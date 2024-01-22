import { ComponentProps } from 'preact'
import { forwardRef } from 'preact/compat'

import styles from './plex.module.scss'

interface PlexButtonProps extends ComponentProps<'button'> {
  warning?: boolean
}
export const PlexButton = forwardRef<HTMLButtonElement, PlexButtonProps>(
  ({ children, warning, ...props }, ref) => {
    const className = `PlayerIconButton-playerButton-zDmEsI IconButton-button-s4bVCh Link-link-SxPFpG Link-default-BXtKLo ${
      warning ? styles.buttonWarning : ''
    }`

    return (
      <div>
        <button {...props} ref={ref} className={className}>
          {children}
        </button>
        {warning && <div />}
      </div>
    )
  }
)
