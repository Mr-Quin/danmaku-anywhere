import { computed, Injectable, signal } from '@angular/core'
import {
  createExtRequest,
  DA_EXT_SOURCE_CONTENT,
  type ExtAction,
  type ExtActionType,
  type ExtMessage,
  type ExtResponse,
  getExtensionAttr,
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

@Injectable({
  providedIn: 'root',
})
export class ExtensionService {
  private readonly $extensionVersion = signal<string | null>(null)
  private readonly $_isLoading = signal(true)

  readonly $isLoading = this.$_isLoading.asReadonly()
  readonly $isExtensionInstalled = computed(() => {
    return this.$extensionVersion() !== null
  })

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
        map((message) => message.data as ExtAction[T])
      )
    })
  }

  private sendMessage<T extends ExtActionType>(
    action: T,
    data: ExtAction[T]['input']
  ): string {
    if (!this.$isExtensionInstalled()) {
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
      '*'
    )
    return id
  }

  async init() {
    const { promise, resolve } = Promise.withResolvers()
    // sometimes the extension script initializes late, so we poll for a small duration
    const interval = setInterval(() => {
      const extensionVersion = getExtensionAttr()

      if (extensionVersion) {
        console.log('Extension version:', extensionVersion)
        this.$extensionVersion.set(extensionVersion)
        this.$_isLoading.set(false)
        clearInterval(interval)
        clearTimeout(timeout)
        resolve(undefined)
      }
    }, 100)

    const timeout = setTimeout(() => {
      this.$_isLoading.set(false)
      clearInterval(interval)
      clearTimeout(timeout)
      resolve(undefined)
    }, 1000)

    return promise
  }
}
