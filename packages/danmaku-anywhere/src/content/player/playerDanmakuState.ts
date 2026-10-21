import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type {
  ControllerSession,
  PlayerApplyCommand,
} from '@/common/rpcClient/background/types'

function startedLater(a: ControllerSession, b: ControllerSession) {
  if (a.startedAt !== b.startedAt) {
    return a.startedAt > b.startedAt
  }
  return a.id > b.id
}

interface DanmakuPlayer {
  mount: (comments: CommentEntity[]) => void
  unmount: () => void
  setVisible: (visible: boolean) => void
}

/**
 * Applies the controller's desired state, ignoring anything older than what
 * was already applied, whatever order the commands arrive in. Visibility and
 * content are compared separately, so a mount that arrives late still brings
 * its comments without undoing a newer hide.
 */
export class PlayerDanmakuState {
  private session: ControllerSession | undefined
  private version = 0
  private contentVersion = 0

  constructor(private readonly player: DanmakuPlayer) {}

  // A controller left over from before the page reloaded the extension can
  // still reach this frame, so only a newer controller takes over. Returns
  // whether this frame now follows the given controller.
  adopt(session: ControllerSession): boolean {
    if (this.session?.id === session.id) {
      return true
    }
    if (this.session && !startedLater(session, this.session)) {
      return false
    }
    this.session = session
    // Below any version the controller sends, so its first state applies
    // even when it is version 0.
    this.version = -1
    this.contentVersion = -1
    return true
  }

  apply({
    session,
    version,
    contentVersion,
    content,
    visible,
  }: PlayerApplyCommand) {
    if (session !== this.session?.id) {
      return
    }
    if (version > this.version) {
      this.version = version
      this.player.setVisible(visible)
    }
    if (content.kind === 'keep' || contentVersion <= this.contentVersion) {
      return
    }
    this.contentVersion = contentVersion
    if (content.kind === 'mount') {
      this.player.mount(content.comments)
    } else {
      this.player.unmount()
    }
  }
}
