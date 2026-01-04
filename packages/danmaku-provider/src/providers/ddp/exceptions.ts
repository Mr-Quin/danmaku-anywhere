import { DanmakuProviderError } from '../../exceptions/BaseError.js'

export class DanDanPlayApiException extends DanmakuProviderError {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
