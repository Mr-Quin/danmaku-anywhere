export abstract class DanmakuProviderError extends Error {
  public url?: string
  public status?: number
  public responseBody?: unknown

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
