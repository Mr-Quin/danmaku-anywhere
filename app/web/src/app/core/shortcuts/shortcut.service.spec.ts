import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental'
import { MessageService } from 'primeng/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchService } from '../../features/search/search.service'
import { SettingsService } from '../../features/settings/settings.service'
import { VideoService } from '../video-player/video.service'
import { ShortcutService } from './shortcut.service'

/**
 * Shortcuts drive the player only while one is mounted, and they leave keys
 * to whatever control owns them: text fields, focused buttons and open
 * dialogs. Ctrl/Cmd+K opens search from anywhere.
 */

function fakePlayer() {
  return {
    fullscreen: false,
    muted: false,
    volume: 0.5,
    backward: 0,
    forward: 0,
    toggle: vi.fn(),
  }
}

type FakePlayer = ReturnType<typeof fakePlayer>

// The player is exposed as a readonly signal, so the test drives the signal
// it reads from instead of stubbing the getter.
function mountPlayer(player: FakePlayer | null) {
  const videoService = TestBed.inject(VideoService) as unknown as {
    $player: { set(value: FakePlayer | null): void }
  }
  videoService.$player.set(player)
}

function keydown(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...init })
}

// A KeyboardEvent only carries a target once it is dispatched at an element.
function keydownFrom(target: Element, key: string) {
  const event = keydown(key)
  target.dispatchEvent(event)
  return event
}

describe('ShortcutService', () => {
  let service: ShortcutService
  let searchService: SearchService
  let settingsService: SettingsService

  beforeEach(() => {
    localStorage.clear()
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideQueryClient(new QueryClient()),
        MessageService,
      ],
    })
    service = TestBed.inject(ShortcutService)
    searchService = TestBed.inject(SearchService)
    settingsService = TestBed.inject(SettingsService)
  })

  it('opens search on ctrl+k even without a player', () => {
    const open = vi.spyOn(searchService, 'open').mockImplementation(() => {})
    const event = keydown('k', { ctrlKey: true })

    expect(service.handleKeydown(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(open).toHaveBeenCalled()
  })

  it('leaves player keys alone when no player is mounted', () => {
    const event = keydown(' ')

    expect(service.handleKeydown(event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('toggles playback and seeks while a player is mounted', () => {
    const player = fakePlayer()
    mountPlayer(player)

    expect(service.handleKeydown(keydown(' '))).toBe(true)
    expect(player.toggle).toHaveBeenCalled()

    expect(service.handleKeydown(keydown('ArrowRight'))).toBe(true)
    expect(player.forward).toBe(5)

    expect(service.handleKeydown(keydown('ArrowLeft'))).toBe(true)
    expect(player.backward).toBe(5)
  })

  it('clamps volume to the player range', () => {
    const player = fakePlayer()
    player.volume = 0.95
    mountPlayer(player)

    service.handleKeydown(keydown('ArrowUp'))
    expect(player.volume).toBe(1)

    player.volume = 0.05
    service.handleKeydown(keydown('ArrowDown'))
    expect(player.volume).toBe(0)
  })

  it('navigates episodes only while the player registered handlers', () => {
    const previous = vi.fn()
    const next = vi.fn()

    expect(service.handleKeydown(keydown('['))).toBe(false)

    service.registerEpisodeNavigation({ previous, next })
    expect(service.handleKeydown(keydown('['))).toBe(true)
    expect(previous).toHaveBeenCalled()
    expect(service.handleKeydown(keydown(']'))).toBe(true)
    expect(next).toHaveBeenCalled()

    service.registerEpisodeNavigation(null)
    expect(service.handleKeydown(keydown(']'))).toBe(false)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('opens settings on ?', () => {
    const show = vi.spyOn(settingsService, 'show').mockImplementation(() => {})

    expect(service.handleKeydown(keydown('?'))).toBe(true)
    expect(show).toHaveBeenCalledWith('general')
  })

  it('ignores keys aimed at editable fields', () => {
    const player = fakePlayer()
    mountPlayer(player)
    const input = document.createElement('input')

    expect(service.handleKeydown(keydownFrom(input, ' '))).toBe(false)
    expect(player.toggle).not.toHaveBeenCalled()
  })

  it('leaves space and enter to a focused button', () => {
    const player = fakePlayer()
    mountPlayer(player)
    const button = document.createElement('button')

    expect(service.handleKeydown(keydownFrom(button, ' '))).toBe(false)
    expect(player.toggle).not.toHaveBeenCalled()
  })

  it('stays out of an open dialog', () => {
    const player = fakePlayer()
    mountPlayer(player)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const inner = document.createElement('span')
    dialog.appendChild(inner)

    expect(service.handleKeydown(keydownFrom(inner, 'f'))).toBe(false)
    expect(player.fullscreen).toBe(false)
  })

  it('ignores keys another handler already consumed', () => {
    const player = fakePlayer()
    mountPlayer(player)
    const event = keydown(' ')
    event.preventDefault()

    expect(service.handleKeydown(event)).toBe(false)
    expect(player.toggle).not.toHaveBeenCalled()
  })

  it('leaves browser combinations alone', () => {
    const player = fakePlayer()
    mountPlayer(player)

    expect(service.handleKeydown(keydown('f', { ctrlKey: true }))).toBe(false)
    expect(service.handleKeydown(keydown('m', { altKey: true }))).toBe(false)
    expect(player.toggle).not.toHaveBeenCalled()
  })

  it('does nothing while disabled, and remembers the choice', () => {
    const player = fakePlayer()
    mountPlayer(player)

    service.setEnabled(false)
    expect(service.$enabled()).toBe(false)
    expect(service.handleKeydown(keydown(' '))).toBe(false)
    expect(localStorage.getItem('da-shortcuts-enabled')).toBe('false')

    service.setEnabled(true)
    expect(service.handleKeydown(keydown(' '))).toBe(true)
    expect(localStorage.getItem('da-shortcuts-enabled')).toBe('true')
  })
})
