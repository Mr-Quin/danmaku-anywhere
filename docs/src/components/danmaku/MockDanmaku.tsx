import type { CSSProperties } from 'react'
import styles from './danmaku.module.css'

interface MockDanmakuProps {
  text: string
  mode: 'top' | 'bottom' | 'ltr' | 'rtl'
  color: string
  gradient?: {
    start: string
    end: string
    stroke?: boolean
  }
  style?: CSSProperties
}

function getGradientStyle(
  gradient: MockDanmakuProps['gradient']
): CSSProperties {
  if (!gradient) return {}

  const { start, end, stroke } = gradient

  return {
    '--gradient-start': start,
    '--gradient-end': end,
    '--gradient-stroke': stroke ? '2px' : '0px',
  } as CSSProperties
}

function getGradientClass(gradient: MockDanmakuProps['gradient']) {
  if (!gradient) return ''

  const { stroke } = gradient

  return stroke ? 'da-danmaku-gradient-stroke' : 'da-danmaku-gradient'
}

// get the css module class for gradient
function getGradientModuleClass(gradient: MockDanmakuProps['gradient']) {
  if (!gradient) return ''

  const { stroke } = gradient

  return stroke ? styles.daDanmakuGradientStroke : styles.daDanmakuGradient
}

// same as the real DanmakuComponent
export const MockDanmaku = ({
  text,
  mode,
  color,
  gradient,
  style = {},
}: MockDanmakuProps) => {
  return (
    <div
      style={
        {
          pointerEvents: 'none',
          '--color': color,
          ...getGradientStyle(gradient),
          ...style,
        } as CSSProperties
      }
      className={`da-danmaku da-danmaku-${mode} da-danmaku-text-shadow ${styles.daDanmaku} ${styles.daDanmakuTextShadow} ${getGradientClass(gradient)} ${getGradientModuleClass(gradient)}`}
      data-text={text}
    >
      {text}
    </div>
  )
}
