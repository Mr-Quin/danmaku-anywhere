import { Injectable, inject, signal } from '@angular/core'
import { SearchService } from '../../features/search/search.service'
import { SettingsService } from '../../features/settings/settings.service'
import { VideoService } from '../video-player/video.service'
import type { ShortcutAction } from './shortcut.definitions'

const ENABLED_STORAGE_KEY = 'da-shortcuts-enabled'
const SEEK_STEP = 5
const VOLUME_STEP = 0.1

interface EpisodeHandlers {
  previous: () => void
  next: () => void
}

// Space and Enter belong to whatever control has focus, so a focused button,
// link or PrimeNG widget keeps its own keyboard behaviour.
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'])

function keepsOwnKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable || INTERACTIVE_TAGS.has(target.tagName)) {
    return true
  }
  return (
    target.closest('[role="dialog"], [role="menu"], [role="listbox"]') !== null
  )
}

function readEnabled(): boolean {
  if (typeof localStorage === 'undefined') {
    return true
  }
  try {
    return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

@Injectable({ providedIn: 'root' })
export class ShortcutService {
  private readonly videoService = inject(VideoService)
  private readonly searchService = inject(SearchService)
  private readonly settingsService = inject(SettingsService)

  private readonly $_enabled = signal(readEnabled())
  readonly $enabled = this.$_enabled.asReadonly()

  private episodeHandlers: EpisodeHandlers | null = null

  setEnabled(enabled: boolean) {
    this.$_enabled.set(enabled)
    if (typeof localStorage === 'undefined') {
      return
    }
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled))
    } catch {
      // localStorage throws in private browsing, the signal still holds the value
    }
  }

  registerEpisodeNavigation(handlers: EpisodeHandlers | null) {
    this.episodeHandlers = handlers
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (
      !this.$_enabled() ||
      event.defaultPrevented ||
      keepsOwnKeys(event.target)
    ) {
      return false
    }

    const key = event.key.toLowerCase()

    // Opening search works everywhere; the player keys only act while a
    // player is mounted, so they never swallow a key on another page.
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault()
      this.searchService.open()
      return true
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false
    }

    const action = resolveAction(key)
    if (!action || !this.perform(action)) {
      return false
    }
    event.preventDefault()
    return true
  }

  private perform(action: ShortcutAction): boolean {
    switch (action) {
      case 'openSearch':
        this.searchService.open()
        return true
      case 'openSettings':
        this.settingsService.show('general')
        return true
      case 'previousEpisode':
        if (!this.episodeHandlers) {
          return false
        }
        this.episodeHandlers.previous()
        return true
      case 'nextEpisode':
        if (!this.episodeHandlers) {
          return false
        }
        this.episodeHandlers.next()
        return true
      default:
        return this.performPlayerAction(action)
    }
  }

  private performPlayerAction(action: ShortcutAction): boolean {
    const player = this.videoService.player()
    if (!player) {
      return false
    }
    switch (action) {
      case 'toggleFullscreen':
        player.fullscreen = !player.fullscreen
        return true
      case 'togglePlay':
        player.toggle()
        return true
      case 'seekBackward':
        player.backward = SEEK_STEP
        return true
      case 'seekForward':
        player.forward = SEEK_STEP
        return true
      case 'volumeUp':
        player.volume = Math.min(1, player.volume + VOLUME_STEP)
        return true
      case 'volumeDown':
        player.volume = Math.max(0, player.volume - VOLUME_STEP)
        return true
      case 'toggleMute':
        player.muted = !player.muted
        return true
      default:
        return false
    }
  }
}

function resolveAction(key: string): ShortcutAction | null {
  switch (key) {
    case 'f':
      return 'toggleFullscreen'
    case ' ':
    case 'k':
      return 'togglePlay'
    case 'arrowleft':
    case 'j':
      return 'seekBackward'
    case 'arrowright':
    case 'l':
      return 'seekForward'
    case 'arrowup':
      return 'volumeUp'
    case 'arrowdown':
      return 'volumeDown'
    case 'm':
      return 'toggleMute'
    case '[':
    case 'pageup':
      return 'previousEpisode'
    case ']':
    case 'pagedown':
      return 'nextEpisode'
    case '/':
      return 'openSearch'
    case '?':
      return 'openSettings'
    default:
      return null
  }
}
