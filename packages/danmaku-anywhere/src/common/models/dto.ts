import type { ModelStorageEntry } from '@/common/storage/opfsModelStore'
import type { ModelEntry } from './schema'

/**
 * Snapshot returned to the management UI: the available models joined with the
 * OPFS download state the background worker observes. The UI overlays the active
 * model id from danmakuOptions (synced storage) on top of this.
 */
export interface ModelManagementState {
  models: ModelEntry[]
  storage: ModelStorageEntry[]
}
