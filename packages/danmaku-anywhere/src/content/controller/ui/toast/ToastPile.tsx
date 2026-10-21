import { Box, Button, CircularProgress, useMediaQuery } from '@mui/material'
import type { FocusEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { AlertWithIndicator } from '@/common/components/Toast/Toast'
import type { Notification } from '@/common/components/Toast/toastStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { AutoCloseTimer } from './autoCloseTimer'
import type { PileItemLayout } from './pileLayout'
import { layoutPile } from './pileLayout'

const EDGE_PX = 20
const EXIT_MS = 200
const FALLBACK_HEIGHT_PX = 48

function useAutoClose(
  notification: Notification,
  paused: boolean,
  onExpire: () => void
) {
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const timerRef = useRef<AutoCloseTimer | null>(null)
  const duration = notification.open ? notification.duration : null

  useEffect(() => {
    if (duration === null) {
      return
    }
    const timer = new AutoCloseTimer(duration, () => onExpireRef.current())
    timerRef.current = timer
    return () => {
      timer.stop()
      timerRef.current = null
    }
  }, [duration, notification.revision])

  useEffect(() => {
    const timer = timerRef.current
    if (!timer) {
      return
    }
    if (paused) {
      timer.pause()
    } else {
      timer.resume()
    }
  }, [paused, duration, notification.revision])
}

function transformFor(layout: PileItemLayout, entered: boolean, open: boolean) {
  if (!entered) {
    return `translateY(calc(100% + ${EDGE_PX}px))`
  }
  const exitShift = open ? 0 : 12
  return `translateY(${exitShift - layout.y}px) scale(${layout.scale})`
}

interface PileToastProps {
  notification: Notification
  layout: PileItemLayout | undefined
  paused: boolean
  reducedMotion: boolean
  onHeight: (key: string, height: number) => void
}

function PileToast({
  notification,
  layout,
  paused,
  reducedMotion,
  onHeight,
}: PileToastProps) {
  const { close, dequeue } = useToast(
    useShallow((state) => ({ close: state.close, dequeue: state.dequeue }))
  )
  const { key, open } = notification
  const [entered, setEntered] = useState(reducedMotion)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const lastLayout = useRef<PileItemLayout | undefined>(layout)
  if (layout) {
    lastLayout.current = layout
  }
  const shown = lastLayout.current

  useAutoClose(notification, paused, () => close(key))

  useLayoutEffect(() => {
    if (entered) {
      return
    }
    // Lay out the off-screen start position so the slide-in transitions from it.
    wrapperRef.current?.getBoundingClientRect()
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (open) {
      return
    }
    const timeout = setTimeout(() => dequeue(key), reducedMotion ? 0 : EXIT_MS)
    return () => clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    const alert = alertRef.current
    if (!alert) {
      return
    }
    const observer = new ResizeObserver(() => {
      onHeight(key, alert.offsetHeight)
    })
    observer.observe(alert)
    return () => observer.disconnect()
  }, [notification.revision])

  if (!shown) {
    return null
  }

  const visible = open && shown.visible

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        height: shown.height,
        overflow: shown.height === undefined ? 'visible' : 'hidden',
        borderRadius: 1,
        transform: transformFor(shown, entered, open),
        transformOrigin: 'top center',
        opacity: entered && visible ? 1 : 0,
        visibility: shown.visible ? 'visible' : 'hidden',
        zIndex: shown.zIndex,
        pointerEvents: visible ? 'auto' : 'none',
        transition: reducedMotion
          ? 'none'
          : 'transform 300ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease',
      }}
    >
      <AlertWithIndicator
        key={notification.revision}
        ref={alertRef}
        duration={notification.duration ?? undefined}
        pause={paused}
        severity={notification.severity}
        icon={
          notification.loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : undefined
        }
        onClose={() => close(key)}
        data-testid="snackbar"
        data-severity={notification.severity}
        data-toast-key={key}
        sx={{
          width: '100%',
          boxShadow: 4,
          '& .MuiAlert-icon, & .MuiAlert-message, & .MuiAlert-action': {
            opacity: shown.contentVisible ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 200ms ease',
          },
          // The message wraps; the action keeps its label on one line
          '& .MuiAlert-message': { minWidth: 0, overflowWrap: 'anywhere' },
          '& .MuiAlert-action': { flexShrink: 0 },
        }}
        action={
          notification.actionFn ? (
            <Button
              size="small"
              color="inherit"
              sx={{ whiteSpace: 'nowrap' }}
              onClick={(e) => {
                // prevent the event from triggering other events like ClickAwayListeners
                e.stopPropagation()
                notification.actionFn?.()
                close(key)
              }}
            >
              {notification.actionLabel}
            </Button>
          ) : undefined
        }
      >
        {notification.message}
      </AlertWithIndicator>
    </Box>
  )
}

export function ToastPile() {
  const { t } = useTranslation()
  const notifications = useToast((state) => state.notifications)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const expanded = hovered || focused

  const openNewestFirst = notifications.filter((n) => n.open).reverse()
  const layout = layoutPile({
    heights: openNewestFirst.map((n) => heights[n.key] ?? FALLBACK_HEIGHT_PX),
    expanded,
    reducedMotion,
  })
  const layoutByKey = new Map(
    openNewestFirst.map((n, i) => [n.key, layout.items[i]])
  )

  useEffect(() => {
    setHeights((prev) => {
      const live = Object.entries(prev).filter(([key]) =>
        notifications.some((n) => n.key === key)
      )
      if (live.length === Object.keys(prev).length) {
        return prev
      }
      return Object.fromEntries(live)
    })
  }, [notifications])

  const handleHeight = (key: string, height: number) => {
    setHeights((prev) => {
      if (prev[key] === height) {
        return prev
      }
      return { ...prev, [key]: height }
    })
  }

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setFocused(false)
    }
  }

  return (
    <Box
      role="region"
      aria-label={t('toast.region', 'Notifications')}
      data-testid="toast-pile"
      data-expanded={expanded}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      sx={{
        position: 'fixed',
        left: EDGE_PX,
        bottom: EDGE_PX,
        width: `min(420px, calc(100vw - ${EDGE_PX * 2}px))`,
        height: layout.height,
        zIndex: 1402,
        pointerEvents: layout.height > 0 ? 'auto' : 'none',
      }}
    >
      {notifications.map((notification) => (
        <PileToast
          key={notification.key}
          notification={notification}
          layout={layoutByKey.get(notification.key)}
          paused={expanded || notification.paused}
          reducedMotion={reducedMotion}
          onHeight={handleHeight}
        />
      ))}
    </Box>
  )
}
