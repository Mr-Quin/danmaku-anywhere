/**
 * Minimal typed state machine base class.
 *
 * State is a discriminated union keyed on `type`. Subclasses define their own
 * state union and call `transition()` from named transition methods. TypeScript's
 * exhaustive `switch (this.state.type)` handles invalid-state errors at
 * compile time — no library needed for machines this simple.
 *
 * @example
 * type State = { type: 'idle' } | { type: 'running'; pid: number }
 *
 * class MyService extends StateMachine<State> {
 *   constructor() { super({ type: 'idle' }) }
 *
 *   start(pid: number) {
 *     if (this.state.type !== 'idle') return
 *     this.transition({ type: 'running', pid })
 *   }
 * }
 */
export class StateMachine<TState extends { type: string }> {
  private _state: TState

  constructor(initial: TState) {
    this._state = initial
  }

  get state(): TState {
    return this._state
  }

  protected transition(next: TState): void {
    this._state = next
  }
}
