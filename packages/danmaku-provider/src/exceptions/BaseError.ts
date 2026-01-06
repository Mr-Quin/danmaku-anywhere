export abstract class DanmakuProviderError extends Error {
  public url?: string
  public status?: number
  public responseBody?: unknown

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts)
    this.name = this.constructor.name
  }
}
