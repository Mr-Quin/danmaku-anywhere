import { MediaObserver } from './MediaObserver'

export class NoopMediaObserver extends MediaObserver {
  public override readonly name: string = 'NoopMediaObserver'

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
  override destroy() {
    super.destroy()
  }
}
