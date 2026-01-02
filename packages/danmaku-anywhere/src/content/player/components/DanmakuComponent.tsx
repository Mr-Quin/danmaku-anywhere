import type { DanmakuRenderProps } from '@danmaku-anywhere/danmaku-engine'
import type { CSSProperties } from 'react'

type DanmakuComponentProps = DanmakuRenderProps

export const DanmakuComponent = ({
  text,
  styles,
  color,
  mode,
}: DanmakuComponentProps) => {
  return (
    <div
      style={
        {
          pointerEvents: 'none',
          '--color': color,
        } as CSSProperties
      }
      className={`da-danmaku da-danmaku-${mode} da-danmaku-text-shadow`}
      data-text={text}
    >
      {text}
    </div>
  )
}
