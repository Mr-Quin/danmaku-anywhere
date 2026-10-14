import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type {
  PlayerCommandOrder,
  PlayerMountCommand,
  PlayerUnmountCommand,
  PlayerVisibilityCommand,
} from '@/common/rpcClient/background/types'

interface DanmakuPlayer {
  mount: (comments: CommentEntity[]) => void
  unmount: () => void
  setVisible: (visible: boolean) => void
}

/**
 * Applies mount, unmount and visibility commands in the order the controller
 * sent them, whatever order they arrive in. What is mounted and whether it is
 * visible are ordered separately, so a mount that arrives late still brings
 * its comments without undoing a newer hide.
 */
export class OrderedPlayerCommands {
  private session = 0
  private lastContent = 0
  private lastVisibility = 0

  constructor(private readonly player: DanmakuPlayer) {}

  mount({ comments, visible, order }: PlayerMountCommand) {
    if (!this.inSession(order)) {
      return
    }
    if (order.command > this.lastVisibility) {
      this.lastVisibility = order.command
      this.player.setVisible(visible)
    }
    if (order.command > this.lastContent) {
      this.lastContent = order.command
      this.player.mount(comments)
    }
  }

  unmount({ order }: PlayerUnmountCommand) {
    if (!this.inSession(order) || order.command <= this.lastContent) {
      return
    }
    this.lastContent = order.command
    this.player.unmount()
  }

  show({ visible, order }: PlayerVisibilityCommand) {
    if (!this.inSession(order) || order.command <= this.lastVisibility) {
      return
    }
    this.lastVisibility = order.command
    this.player.setVisible(visible)
  }

  // A controller that started later begins its own order; anything from an
  // earlier controller is dropped.
  private inSession({ session }: PlayerCommandOrder) {
    if (session < this.session) {
      return false
    }
    if (session > this.session) {
      this.session = session
      this.lastContent = 0
      this.lastVisibility = 0
    }
    return true
  }
}
