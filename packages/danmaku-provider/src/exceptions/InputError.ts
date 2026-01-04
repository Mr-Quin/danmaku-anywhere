import { DanmakuProviderError } from './BaseError.js'

export class InputError extends DanmakuProviderError {
  constructor(message: string) {
    super(message)
  }
}
