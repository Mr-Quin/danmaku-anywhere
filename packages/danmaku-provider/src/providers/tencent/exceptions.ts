import { DanmakuProviderError } from '../../exceptions/BaseError.js'

export class TencentApiException extends DanmakuProviderError {
  constructor(
    message: string,
    public code?: number,
    public cookie?: boolean // if the exception is caused by cookie
  ) {
    super(message)
  }
}
