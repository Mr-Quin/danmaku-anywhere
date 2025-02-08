import { Context, Effect, Ref } from 'effect'

interface StoreState {
  path: string
  cacheHit: boolean
}

export class Store {
  get: Effect.Effect<StoreState>

  constructor(public ref: Ref.Ref<StoreState>) {
    this.get = Ref.get(this.ref)
  }

  setPath(path: string) {
    return Ref.update(this.ref, (v) => ({ ...v, path }))
  }

  setCacheHit(cacheHit: boolean) {
    return Ref.update(this.ref, (v) => ({ ...v, cacheHit }))
  }

  static Create() {
    return Effect.andThen(
      Ref.make({
        path: '',
        cacheHit: false,
      }),
      (v) => new Store(v)
    )
  }
}

export class State extends Context.Tag('State')<State, Store>() {}
