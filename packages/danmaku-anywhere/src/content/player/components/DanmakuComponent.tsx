import type { DanmakuRenderProps } from '@danmaku-anywhere/danmaku-engine'
import type { CSSProperties } from 'react'

type DanmakuComponentProps = DanmakuRenderProps

function getGradientStyle(
  gradient: DanmakuComponentProps['gradient']
): CSSProperties {
  if (!gradient) return {}

  const { start, end, stroke } = gradient

  return {
    '--gradient-start': start,
    '--gradient-end': end,
    '--gradient-stroke': stroke ? '2px' : '0px',
  } as CSSProperties
}

function getGradientClass(gradient: DanmakuComponentProps['gradient']) {
  if (!gradient) return ''

  const { stroke } = gradient

  return stroke ? 'da-danmaku-gradient-stroke' : 'da-danmaku-gradient'
}

export const DanmakuComponent = ({
  text,
  styles,
  color,
  mode,
  gradient,
}: DanmakuComponentProps) => {
  return (
    <div
      style={
        {
          pointerEvents: 'none',
          '--color': color,
          ...getGradientStyle(gradient),
        } as CSSProperties
      }
      className={`da-danmaku da-danmaku-${mode} da-danmaku-text-shadow ${getGradientClass(gradient)}`}
      data-text={text} // for custom css that want to access the text
    >
      {text}
    </div>
  )
}
