import { ComponentProps } from 'preact'
import { forwardRef } from 'preact/compat'

import styles from './panel.module.scss'

type PopupPanelWrapperProps = ComponentProps<'div'>

export const PopupPanelWrapper = forwardRef<
  HTMLDivElement,
  PopupPanelWrapperProps
>(({ children, ...props }, ref) => {
  return (
    <div className={styles.panelWrapper} {...props} ref={ref}>
      <div className={styles.panel}>{children}</div>
    </div>
  )
})
