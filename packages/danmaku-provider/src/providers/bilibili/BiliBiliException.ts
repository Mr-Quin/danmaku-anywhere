export class BiliBiliException extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
