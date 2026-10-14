import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it } from 'vitest'
import { OrderedPlayerCommands } from './orderedPlayerCommands'

/**
 * The relay does not guarantee that commands reach a player in the order the
 * controller sent them. The player applies a mount or unmount only when it is
 * newer than the last one it applied, and a show, hide or a mount's visibility
 * only when newer than the last visibility it applied, so a command arriving
 * late never undoes a newer one. A controller that started later begins a new
 * order. Drives the receiver with a fake player and asserts what it shows.
 */

function comments(title: string): CommentEntity[] {
  return [{ p: '0,1,16777215', m: title }] as CommentEntity[]
}

class FakePlayer {
  shown: string | undefined
  visible = true
  mount(mounted: CommentEntity[]) {
    this.shown = mounted[0]?.m
  }
  unmount() {
    this.shown = undefined
  }
  setVisible(visible: boolean) {
    this.visible = visible
  }
}

const SESSION = 1000

function order(command: number, session = SESSION) {
  return { session, command }
}

describe('OrderedPlayerCommands', () => {
  let player: FakePlayer
  let commands: OrderedPlayerCommands

  beforeEach(() => {
    player = new FakePlayer()
    commands = new OrderedPlayerCommands(player)
  })

  it('keeps the newer mount when an older one arrives after it', () => {
    commands.mount({ comments: comments('B'), visible: true, order: order(2) })
    commands.mount({ comments: comments('A'), visible: true, order: order(1) })

    expect(player.shown).toBe('B')
  })

  it('stays unmounted when a mount sent before the unmount arrives after it', () => {
    commands.mount({ comments: comments('A'), visible: true, order: order(1) })
    commands.unmount({ order: order(3) })
    commands.mount({ comments: comments('B'), visible: true, order: order(2) })

    expect(player.shown).toBeUndefined()
  })

  it('ignores an unmount that arrives after a newer mount', () => {
    commands.mount({ comments: comments('B'), visible: true, order: order(3) })
    commands.unmount({ order: order(2) })

    expect(player.shown).toBe('B')
  })

  it('keeps a newer hide when an older show arrives after it', () => {
    commands.show({ visible: false, order: order(3) })
    commands.show({ visible: true, order: order(2) })

    expect(player.visible).toBe(false)
  })

  it('mounts late content without undoing a newer hide', () => {
    commands.mount({ comments: comments('A'), visible: true, order: order(1) })
    commands.show({ visible: false, order: order(3) })
    commands.mount({ comments: comments('B'), visible: true, order: order(2) })

    expect(player.shown).toBe('B')
    expect(player.visible).toBe(false)
  })

  it('applies a mount visibility newer than the last show', () => {
    commands.show({ visible: true, order: order(1) })
    commands.mount({ comments: comments('A'), visible: false, order: order(2) })

    expect(player.visible).toBe(false)
  })

  it('starts over for a controller that started later', () => {
    commands.mount({ comments: comments('A'), visible: true, order: order(5) })
    commands.mount({
      comments: comments('B'),
      visible: true,
      order: order(1, SESSION + 1),
    })
    expect(player.shown).toBe('B')

    commands.mount({ comments: comments('C'), visible: true, order: order(6) })
    expect(player.shown).toBe('B')
  })
})
