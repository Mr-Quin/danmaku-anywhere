import { MediaObserver } from './MediaObserver'

export class NoopMediaObserver extends MediaObserver {
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
