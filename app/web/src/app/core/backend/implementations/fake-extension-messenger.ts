import { Injectable, inject } from '@angular/core'
import type {
  ExtAction,
  ExtActionType,
  MediaInfo,
} from '@danmaku-anywhere/web-scraper'
import { defer, delay, type Observable, of, throwError } from 'rxjs'
import { ExtensionMessenger } from '../extension-messenger'
import { FakeBackendRecorder } from '../fake-backend-recorder'
import { fakeLatencyMs, shouldFail } from '../fake-control'
import {
  fakeChapters,
  fakeEpisodes,
  fakeMedia,
  fakeSearchResults,
} from '../fixtures/kazumi-fixtures'

@Injectable()
export class FakeExtensionMessenger extends ExtensionMessenger {
  private readonly recorder = inject(FakeBackendRecorder)

  single<T extends ExtActionType>(
    action: T,
    payload: ExtAction[T]['input']
  ): Observable<ExtAction[T]['output']> {
    return this.withSeam(action, payload, () => of(this.resolveSingle(action)))
  }

  stream<T extends ExtActionType>(
    action: T,
    data: ExtAction[T]['input']
  ): Observable<ExtAction[T]['output']> {
    return this.withSeam(action, data, () => of(...this.resolveStream(action)))
  }

  private withSeam<T extends ExtActionType>(
    action: T,
    payload: ExtAction[T]['input'],
    source: () => Observable<ExtAction[T]['output']>
  ): Observable<ExtAction[T]['output']> {
    return defer(() => {
      if (shouldFail(action)) {
        this.recorder.record({
          channel: 'extension',
          action,
          argsSummary: summarize(payload),
          ok: false,
        })
        return throwError(() => new Error(`fake extension failure: ${action}`))
      }
      this.recorder.record({
        channel: 'extension',
        action,
        argsSummary: summarize(payload),
        ok: true,
      })
      const latency = fakeLatencyMs()
      const emitted = source()
      return latency > 0 ? emitted.pipe(delay(latency)) : emitted
    })
  }

  private resolveSingle<T extends ExtActionType>(
    action: T
  ): ExtAction[T]['output'] {
    switch (action) {
      case 'kazumiSearch':
        return fakeSearchResults as ExtAction[T]['output']
      case 'kazumiGetChapters':
        return fakeChapters as ExtAction[T]['output']
      case 'episodeGetAll':
        return fakeEpisodes as ExtAction[T]['output']
      case 'setRequestHeaders':
        return undefined as ExtAction[T]['output']
      case 'danmakuGet':
        throw new Error('danmakuGet not stubbed in fake backend')
      default:
        throw new Error(`fake extension single unhandled: ${action}`)
    }
  }

  private resolveStream<T extends ExtActionType>(
    action: T
  ): ExtAction[T]['output'][] {
    if (action === 'extractMedia') {
      return [fakeMedia satisfies MediaInfo as ExtAction[T]['output']]
    }
    throw new Error(`fake extension stream unhandled: ${action}`)
  }
}

function summarize(payload: unknown): string {
  if (payload === undefined) {
    return 'undefined'
  }
  const json = JSON.stringify(payload)
  if (json.length <= 120) {
    return json
  }
  return `${json.slice(0, 117)}...`
}
