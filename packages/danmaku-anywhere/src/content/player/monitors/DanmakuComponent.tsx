import { DanmakuRenderProps } from '@danmaku-anywhere/danmaku-engine'

type DanmakuComponentProps = DanmakuRenderProps

export const DanmakuComponent = ({ text, styles }: DanmakuComponentProps) => {
  return <div style={styles}>{text}</div>
}
