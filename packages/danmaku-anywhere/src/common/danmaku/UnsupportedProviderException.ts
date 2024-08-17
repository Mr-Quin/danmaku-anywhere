import type { DanmakuSourceType } from '@/common/danmaku/enums'

export class UnsupportedProviderException extends Error {
  constructor(provider: DanmakuSourceType, message?: string) {
    super(`Unsupported provider: ${provider}${message ? `: ${message}` : ''}`)
  }
}
