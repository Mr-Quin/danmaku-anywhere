export interface Message {
  action: string
  payload: any
}

export interface MessageResponse<P, E = unknown> {
  type: 'success' | 'error'
  payload: P extends 'error' ? E : P
}

export type PayloadOf<T extends Message, Action> = Extract<
  T,
  { action: Action }
>['payload']
