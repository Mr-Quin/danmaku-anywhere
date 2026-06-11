import { inject, injectable } from 'inversify'
import { DA_ENV, EXTENSION_VERSION, IS_DA_E2E } from '@/common/constants'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { Surface, TelemetryEventName } from '@/common/telemetry/events'

const FLUSH_AT_EVENTS = 20
const FLUSH_INTERVAL_MS = 30_000
const INTAKE_URL = `${import.meta.env.VITE_PROXY_URL}/v1/intake`

interface TelemetryEnvelope {
  installId: string
  event: string
  properties: object
  clientTs: number
  version: string
  environment: string
  surface: Surface
}

@injectable('Singleton')
export class TelemetryManager {
  private logger: ILogger
  private buffer: TelemetryEnvelope[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private consent = true
  private installId?: string

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[TelemetryManager]')
  }

  async setup() {
    if (this.disabled) {
      return
    }

    const options = await this.extensionOptionsService.get()
    this.consent = options.enableAnalytics
    this.installId = options.id

    this.extensionOptionsService.onChange((next) => {
      this.consent = next.enableAnalytics
      this.installId = next.id
    })
  }

  track(
    event: TelemetryEventName,
    properties: object,
    surface: Surface,
    clientTs: number
  ) {
    if (this.disabled || !this.consent || !this.installId) {
      return
    }

    this.buffer.push({
      installId: this.installId,
      event,
      properties,
      clientTs,
      version: EXTENSION_VERSION,
      environment: DA_ENV,
      surface,
    })

    // Background-origin events (e.g. the daily heartbeat) are rare and fire
    // while the worker is awake; flush now so a size-1 buffer is not lost when
    // MV3 suspends the worker before the timer elapses.
    if (this.buffer.length >= FLUSH_AT_EVENTS || surface === 'background') {
      void this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  private get disabled() {
    return IS_DA_E2E || IS_STANDALONE_RUNTIME
  }

  private scheduleFlush() {
    if (this.flushTimer !== null) {
      return
    }
    this.flushTimer = setTimeout(() => {
      void this.flush()
    }, FLUSH_INTERVAL_MS)
  }

  private async flush() {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.buffer.length === 0) {
      return
    }

    const batch = this.buffer
    this.buffer = []

    try {
      await fetch(INTAKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'da-version': EXTENSION_VERSION,
        },
        body: JSON.stringify(batch),
        // Let an in-flight flush complete even if MV3 suspends the worker.
        keepalive: true,
      })
    } catch (e) {
      this.logger.debug('Flush failed, dropping batch', e)
    }
  }
}
