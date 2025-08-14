import { useEffect, useRef, useState } from 'react'
import type { SkipTarget } from '@/content/player/videoSkip/SkipTarget'
import styles from './SkipButton.module.css'

export interface SkipButtonProps {
  target: SkipTarget
  onClick: () => void
  onClose: () => void
}

export function SkipButton(props: SkipButtonProps) {
  const { target, onClick, onClose } = props

  const [isExiting, setIsExiting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClose = () => {
    setIsExiting(true)
    timeoutRef.current = setTimeout(() => {
      onClose()
    }, 200) // sync with CSS animation duration
  }

  const alertClassName = `${styles.alert} ${isExiting ? styles.alertExit : styles.alertEnter}`

  return (
    <div className={styles.wrapper}>
      <div className={alertClassName}>
        <button type="button" className={styles.textButton} onClick={onClick}>
          {`空降至 ${formatTimestamp(target.endTime)}`}
        </button>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
