import { DanmakuProviderError } from './BaseError'

export class InputError extends DanmakuProviderError {
  constructor(message: string) {
    super(message)
  }
}
