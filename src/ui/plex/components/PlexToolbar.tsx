import { useEffect, useState, useRef } from 'preact/hooks'
import { shallow } from 'zustand/shallow'
import { createPortal, forwardRef, PropsWithChildren } from 'preact/compat'
import { Ref } from 'preact'
import { DanmakuMenu } from '../../danmaku/DanmakuMenu'
import { SettingsMenu } from '../../danmaku/SettingsMenu'
import { useIsVisible } from '../../hooks/useIsVisible'
import {
  DanmakuIcon,
  InfoIcon,
  SettingsIcon,
  VisibleIcon,
  VisibleOffIcon,
} from '../../components/Icons'
import { ClickawayListener } from '../../components/ClickawayListener'
import { getDanmakuContainer } from '../plexMediaUtils'
import { PlexButton } from './PlexButton'
import styles from './plex.module.scss'
import { useDanmaku, useStore } from '@/store/store'
import { logger } from '@/utils/logger'
import { mergeRefs } from '@/utils/mergeRefs'
import { InfoMenu } from '@/ui/danmaku/InfoMenu'

interface Position {
  top: number
  left: number
}

interface PlexToolbarButtonProps {
  onClick?: (position: Position) => void
}

const PlexToolbarButton = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<PlexToolbarButtonProps>
>(({ children, onClick }, forwardedRef) => {
  const innerRef = useRef<HTMLButtonElement>(null)
  const { results } = useStore((state) => state.media, shallow)

  const ref = mergeRefs(forwardedRef, innerRef)

  const handleClick = () => {
    if (innerRef.current) {
      const rect = innerRef.current.getBoundingClientRect()
      onClick?.({ top: rect.top, left: rect.left })
    }
  }

  return (
    <PlexButton onClick={handleClick} ref={ref} warning={results.length === 0}>
      {children}
    </PlexButton>
  )
})

interface ToggleDanmakuButtonProps {
  onClick?: () => void
}

const ToggleDanmakuButton = ({ onClick }: ToggleDanmakuButtonProps) => {
  const { config } = useDanmaku()
  const toggleDanmaku = useStore.use.toggleDanmaku()

  const handleClick = () => {
    toggleDanmaku()
    onClick?.()
  }

  return (
    <PlexToolbarButton onClick={handleClick}>
      {config.enabled ? <VisibleIcon /> : <VisibleOffIcon />}
    </PlexToolbarButton>
  )
}

type MenuName = 'danmaku' | 'settings' | 'info'

export const PlexToolbar = () => {
  const [visible, ref] = useIsVisible<HTMLDivElement>()
  const [currentMenu, setCurrentMenu] = useState<MenuName | null>(null)
  const [menuPosition, setMenuPosition] = useState<Position>({
    top: 0,
    left: 0,
  })

  const danmakuButtonRef = useRef<HTMLButtonElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const infoButtonRef = useRef<HTMLButtonElement>(null)

  const portalRef = useRef(document.getElementById('danmaku-portal'))

  const shouldMount = currentMenu !== null

  if (!portalRef.current) throw new Error('Danmaku portal root not found')

  useEffect(() => {
    logger.debug('Mounting Plex toolbar')

    return () => {
      logger.debug('Unmounting Plex toolbar')
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      setCurrentMenu(null)
    }
  }, [visible])

  const handleClickaway = (e: MouseEvent) => {
    if (
      danmakuButtonRef.current?.contains(e.target as Node) ||
      settingsButtonRef.current?.contains(e.target as Node) ||
      infoButtonRef.current?.contains(e.target as Node)
    )
      return

    setCurrentMenu(null)
  }

  const handleButtonClick = (name: MenuName) => (position: Position) => {
    if (currentMenu === name) {
      setCurrentMenu(null)
      return
    }
    setCurrentMenu(name)
    setMenuPosition(position)
  }

  // TODO: allow theming of the popup panels
  return (
    <div className={styles.toolbar} ref={ref}>
      {shouldMount &&
        createPortal(
          <ClickawayListener onClickaway={handleClickaway}>
            {(ref) => (
              <div
                className={`${styles.popupPanel}`}
                style={{
                  top: menuPosition.top,
                  left: menuPosition.left,
                  transform: `translateY(${visible ? '-100%' : '100%'})`,
                }}
                ref={ref as Ref<HTMLDivElement>}
              >
                {currentMenu === 'danmaku' ? (
                  <DanmakuMenu getDanmakuContainer={getDanmakuContainer} />
                ) : currentMenu === 'settings' ? (
                  <SettingsMenu />
                ) : (
                  <InfoMenu />
                )}
              </div>
            )}
          </ClickawayListener>,
          portalRef.current
        )}
      <PlexToolbarButton
        onClick={handleButtonClick('danmaku')}
        ref={danmakuButtonRef}
      >
        <DanmakuIcon />
      </PlexToolbarButton>
      <PlexToolbarButton
        onClick={handleButtonClick('settings')}
        ref={settingsButtonRef}
      >
        <SettingsIcon />
      </PlexToolbarButton>
      <ToggleDanmakuButton />
      <PlexToolbarButton
        onClick={handleButtonClick('info')}
        ref={infoButtonRef}
      >
        <InfoIcon />
      </PlexToolbarButton>
    </div>
  )
}
