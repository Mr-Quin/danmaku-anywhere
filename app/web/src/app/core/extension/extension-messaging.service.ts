import { Injectable, inject } from '@angular/core'
import {
  createExtRequest,
  DA_EXT_SOURCE_CONTENT,
  type ExtAction,
  type ExtActionType,
  type ExtMessage,
  type ExtResponse,
} from '@danmaku-anywhere/web-scraper'
import {
  defer,
  filter,
  first,
  fromEvent,
  map,
  type Observable,
  of,
  share,
  switchMap,
  takeWhile,
  tap,
  throwError,
} from 'rxjs'
import { ExtensionService } from './extension.service'

@Injectable({
  providedIn: 'root',
})
export class ExtensionMessagingService {
  private extensionService = inject(ExtensionService)

  private allMessages$ = fromEvent<MessageEvent<ExtMessage>>(
    window,
    'message'
  ).pipe(
    map((event) => event.data),
    filter(
      (data): data is ExtResponse =>
        data?.source === DA_EXT_SOURCE_CONTENT && data?.type === 'response'
    ),
    share()
  )

  private reqId = 0

  single<T extends ExtActionType>(
    action: T,
    payload: ExtAction[T]['input']
  ): Observable<ExtAction[T]['output']> {
    return defer(() => {
      const id = this.sendMessage(action, payload)

      return this.allMessages$.pipe(
        filter((message) => message.id === id),
        first(),
        switchMap((message) => {
          if (message.success) {
            return of(message.data)
          }
          return throwError(
            () =>
              message.err ?? new Error(`Request failed for action: ${action}`)
          )
        })
      )
    })
  }

  stream<T extends ExtActionType>(
    action: T,
    data: ExtAction[T]['input']
  ): Observable<ExtAction[T]['output']> {
    return defer(() => {
      const id = this.sendMessage(action, data)

      return this.allMessages$.pipe(
        filter((message) => message.id === id),
        tap((message) => {
          if (!message.success) {
            console.debug('Stream encountered error:', message.err, message)
          }
        }),
        // complete the stream when isLast is true
        takeWhile((message) => !message.isLast, true),
        filter((message) => message.success),
        map((message) => message.data as ExtAction[T]['output'])
      )
    })
  }

  private sendMessage<T extends ExtActionType>(
    action: T,
    data: ExtAction[T]['input']
  ): string {
    if (!this.extensionService.$isExtensionInstalled()) {
      throw new Error('Extension is not installed.')
    }

    const id = `${action}-${this.reqId++}`

    window.postMessage(
      createExtRequest({
        source: 'app',
        id,
        data,
        action,
      }),
      window.location.origin
    )
    return id
  }
}
