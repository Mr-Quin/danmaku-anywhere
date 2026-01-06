import { DanmakuProviderError } from '../../exceptions/BaseError.js'

export class BiliBiliApiException extends DanmakuProviderError {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
