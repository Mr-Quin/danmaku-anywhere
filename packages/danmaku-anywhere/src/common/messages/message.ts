export interface Message {
  action: string
  payload?: any
}

export interface SuccessMessageResponse<P = any> {
  success: true
  payload: P
}

export interface ErrorMessageResponse {
  success: false
  error: string
}

export type MessageResponse<P = any> =
  | SuccessMessageResponse<P>
  | ErrorMessageResponse

export type MessageOf<T extends Message, Action> = Extract<
  T,
  { action: Action }
>

export type PayloadOf<T extends Message, Action> = MessageOf<
  T,
  Action
>['payload']
