export class DanDanPlayApiException extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
