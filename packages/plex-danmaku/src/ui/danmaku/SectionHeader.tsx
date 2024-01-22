import { ComponentProps, forwardRef } from 'preact/compat'

import styles from './panel.module.scss'

export const SectionHeader = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ children }, ref) => {
    return (
      <div className={styles.sectionHeader} ref={ref}>
        {children}
      </div>
    )
  }
)
