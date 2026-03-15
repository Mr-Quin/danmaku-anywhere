import { DanmakuProviderError } from '../../exceptions/BaseError'

export class DanDanPlayApiException extends DanmakuProviderError {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
