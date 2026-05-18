import type {
  CollapseAnnotation,
  DanmakuRenderProps,
} from '@danmaku-anywhere/danmaku-engine'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useSyncExternalStore } from 'react'

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
  return gradient.stroke ? 'da-danmaku-gradient-stroke' : 'da-danmaku-gradient'
}

function CollapseCounter({ count, pulse }: { count: number; pulse: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!pulse || count < 2) return
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    el.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], {
      duration: 220,
      easing: 'ease-out',
    })
  }, [count, pulse])
  return (
    <span ref={ref} className="dan-collapsed__count">
      ×{count}
    </span>
  )
}

function useCollapseCount(collapse: CollapseAnnotation) {
  return useSyncExternalStore(
    collapse.store.subscribe,
    collapse.store.getSnapshot,
    collapse.store.getSnapshot
  ).count
}

export const DanmakuComponent = ({
  text,
  color,
  mode,
  gradient,
  collapse,
}: DanmakuComponentProps) => {
  const collapseCount = collapse ? <CollapseInner collapse={collapse} /> : null
  return (
    <div
      style={
        {
          pointerEvents: 'none',
          '--color': color,
          ...getGradientStyle(gradient),
        } as CSSProperties
      }
      className={[
        'da-danmaku',
        `da-danmaku-${mode}`,
        'da-danmaku-text-shadow',
        getGradientClass(gradient),
        collapse ? 'dan-collapsed' : '',
        collapse ? `dan-collapsed--${collapse.label}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-text={text}
      data-collapse-label={collapse?.label}
    >
      {collapse ? collapse.label : text}
      {collapseCount}
    </div>
  )
}

function CollapseInner({ collapse }: { collapse: CollapseAnnotation }) {
  const count = useCollapseCount(collapse)
  return <CollapseCounter count={count} pulse={collapse.pulse} />
}
