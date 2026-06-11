import type {
  OcclusionModel,
  OcclusionQuality,
} from '@/common/options/danmakuOptions/constant'
import type { OcclusionStatusReason } from '@/content/player/occlusion/Occlusion.types'

export type Surface = 'popup' | 'content' | 'player' | 'background'

export type DanmakuMountMode = 'manual' | 'auto'

export type EpisodeMatchResult = 'success' | 'disambiguation' | 'notFound'

interface ProviderConfigEventProps {
  manifestId: string
}

// The backend treats these payloads as opaque, so the catalog does not
// constrain their shape.
type OpaqueProps = object

type EmptyProps = Record<string, never>

export interface TelemetryEventMap {
  heartbeat: { browser: string }

  fetchDanmaku: OpaqueProps
  integrationPolicyMediaChange: OpaqueProps
  integrationPolicyError: OpaqueProps
  dragFabEnd: OpaqueProps
  searchSeason: OpaqueProps
  search: OpaqueProps
  parseUrl: { hostname: string }
  editConfig: OpaqueProps
  addConfig: OpaqueProps

  occlusionToggle: {
    enabled: boolean
    model: OcclusionModel
    quality: OcclusionQuality
  }
  occlusionStart: { model: OcclusionModel; quality: OcclusionQuality }
  occlusionStatus: { reason: OcclusionStatusReason }

  clickSkipButton: OpaqueProps
  skipButtonToggle: { enabled: boolean }

  danmakuMount: {
    mode: DanmakuMountMode
    manifestId: string | null
    commentCount: number
  }
  danmakuUnmount: { mode: DanmakuMountMode }
  episodeMatch: { result: EpisodeMatchResult }
  styleUpdate: { changedKeys: string[] }

  providerConfigCreate: ProviderConfigEventProps
  providerConfigUpdate: ProviderConfigEventProps
  providerConfigDelete: ProviderConfigEventProps
  providerConfigToggle: ProviderConfigEventProps

  manifestSave: { mode: 'create' | 'update' }
  manifestDelete: EmptyProps

  backupExport: EmptyProps
  backupImport: EmptyProps
  cloudBackupCreate: EmptyProps
  cloudBackupRestore: EmptyProps
}

export type TelemetryEventName = keyof TelemetryEventMap

export interface TelemetryRelayEvent {
  event: TelemetryEventName
  properties: object
  surface: Surface
  clientTs: number
}
