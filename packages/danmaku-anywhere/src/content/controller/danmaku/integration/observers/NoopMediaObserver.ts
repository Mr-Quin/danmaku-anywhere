import { MediaObserver } from './MediaObserver'

export class NoopMediaObserver extends MediaObserver {
  public readonly name: string = 'NoopMediaObserver'

  constructor() {
    super()
  }

  setup() {
    // noop
  }
  run() {
    // noop
  }
  reset() {
    // noop
  }
  destroy() {
    super.destroy()
  }
}
