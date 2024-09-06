export class TencentException extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
