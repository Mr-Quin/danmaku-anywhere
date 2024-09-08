export class BiliBiliApiException extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
