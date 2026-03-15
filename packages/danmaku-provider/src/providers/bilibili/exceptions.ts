import { DanmakuProviderError } from '../../exceptions/BaseError'

export class BiliBiliApiException extends DanmakuProviderError {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
