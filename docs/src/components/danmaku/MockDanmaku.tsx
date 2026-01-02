import type { CSSProperties } from 'react'
import styles from './danmaku.module.css'

interface MockDanmakuProps {
  text: string
  mode: 'top' | 'bottom' | 'ltr' | 'rtl'
  color: string
  style?: CSSProperties
}

// same as the real DanmakuComponent
export const MockDanmaku = ({
  text,
  mode,
  color,
  style = {},
}: MockDanmakuProps) => {
  return (
    <div
      style={
        {
          pointerEvents: 'none',
          '--color': color,
          ...style,
        } as CSSProperties
      }
      className={`da-danmaku da-danmaku-${mode} da-danmaku-text-shadow ${styles.daDanmaku} ${styles.daDanmakuTextShadow}`}
      data-text={text}
    >
      {text}
    </div>
  )
}
