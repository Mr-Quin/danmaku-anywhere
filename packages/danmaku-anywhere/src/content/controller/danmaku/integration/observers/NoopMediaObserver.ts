import { MediaObserver } from './MediaObserver'

export class NoopMediaObserver extends MediaObserver {
  constructor() {
    super()
  }

  setup() {
    // noop
  }
  restart() {
    // noop
  }
  reset() {
    // noop
  }
  destroy() {
    super.destroy()
    // noop
  }
}
