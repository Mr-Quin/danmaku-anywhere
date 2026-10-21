import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it } from 'vitest'
import { OrderedPlayerCommands } from './orderedPlayerCommands'

/**
 * The relay does not guarantee that commands reach a player in the order the
 * controller sent them. The player takes the controller's session from its
 * handshake and applies a mount or unmount only when it is newer than the
 * last one it applied, and a show, hide or a mount's visibility only when
 * newer than the last visibility it applied, so a command arriving late never
 * undoes a newer one. Commands from any other session are dropped, and a
 * dropped mount or unmount says so. Drives the receiver with a fake player and
 * asserts what it shows.
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

const SESSION = 'controller-a'

function order(command: number, session = SESSION) {
  return { session, command }
}

describe('OrderedPlayerCommands', () => {
  let player: FakePlayer
  let commands: OrderedPlayerCommands

  beforeEach(() => {
    player = new FakePlayer()
    commands = new OrderedPlayerCommands(player)
    commands.adopt(SESSION)
  })

  it('keeps the newer mount when an older one arrives after it', () => {
    commands.mount({ comments: comments('B'), visible: true, order: order(2) })
    const late = commands.mount({
      comments: comments('A'),
      visible: true,
      order: order(1),
    })

    expect(late).toBe(false)
    expect(player.shown).toBe('B')
  })

  it('stays unmounted when a mount sent before the unmount arrives after it', () => {
    commands.mount({ comments: comments('A'), visible: true, order: order(1) })
    expect(commands.unmount({ order: order(3) })).toBe(true)
    commands.mount({ comments: comments('B'), visible: true, order: order(2) })

    expect(player.shown).toBeUndefined()
  })

  it('ignores an unmount that arrives after a newer mount', () => {
    commands.mount({ comments: comments('B'), visible: true, order: order(3) })

    expect(commands.unmount({ order: order(2) })).toBe(false)
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

  it('drops commands from a session it has not adopted', () => {
    const other = order(9, 'controller-b')

    expect(
      commands.mount({ comments: comments('A'), visible: false, order: other })
    ).toBe(false)
    expect(commands.unmount({ order: other })).toBe(false)
    commands.show({ visible: false, order: other })

    expect(player.shown).toBeUndefined()
    expect(player.visible).toBe(true)
  })

  it('drops everything before it adopts a session', () => {
    const fresh = new OrderedPlayerCommands(player)

    expect(
      fresh.mount({ comments: comments('A'), visible: true, order: order(1) })
    ).toBe(false)
    expect(player.shown).toBeUndefined()
  })

  it('starts over for a new controller and drops the old one', () => {
    commands.mount({ comments: comments('A'), visible: true, order: order(5) })
    commands.adopt('controller-b')

    commands.mount({
      comments: comments('B'),
      visible: true,
      order: order(1, 'controller-b'),
    })
    expect(player.shown).toBe('B')

    commands.mount({ comments: comments('C'), visible: true, order: order(6) })
    expect(player.shown).toBe('B')
  })

  it('keeps its order when the same controller hands over its session again', () => {
    commands.mount({ comments: comments('B'), visible: true, order: order(4) })
    commands.adopt(SESSION)

    commands.mount({ comments: comments('A'), visible: true, order: order(3) })
    expect(player.shown).toBe('B')
  })
})
