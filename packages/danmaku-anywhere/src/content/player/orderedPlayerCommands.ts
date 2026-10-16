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
 * Applies mount, unmount and visibility commands from the adopted controller
 * session in the order that controller sent them, whatever order they arrive
 * in. What is mounted and whether it is visible are ordered separately, so a
 * mount that arrives late still brings its comments without undoing a newer
 * hide. Mount and unmount return whether they were applied.
 */
export class OrderedPlayerCommands {
  private session: string | undefined
  private lastContent = 0
  private lastVisibility = 0

  constructor(private readonly player: DanmakuPlayer) {}

  // Called on each handshake from a controller. Only a different controller
  // starts the order over.
  adopt(session: string) {
    if (session === this.session) {
      return
    }
    this.session = session
    this.lastContent = 0
    this.lastVisibility = 0
  }

  mount({ comments, visible, order }: PlayerMountCommand): boolean {
    if (!this.isAdopted(order)) {
      return false
    }
    if (order.command > this.lastVisibility) {
      this.lastVisibility = order.command
      this.player.setVisible(visible)
    }
    if (order.command <= this.lastContent) {
      return false
    }
    this.lastContent = order.command
    this.player.mount(comments)
    return true
  }

  unmount({ order }: PlayerUnmountCommand): boolean {
    if (!this.isAdopted(order) || order.command <= this.lastContent) {
      return false
    }
    this.lastContent = order.command
    this.player.unmount()
    return true
  }

  show({ visible, order }: PlayerVisibilityCommand) {
    if (!this.isAdopted(order) || order.command <= this.lastVisibility) {
      return
    }
    this.lastVisibility = order.command
    this.player.setVisible(visible)
  }

  private isAdopted({ session }: PlayerCommandOrder) {
    return this.session !== undefined && session === this.session
  }
}
