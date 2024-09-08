export class TencentApiException extends Error {
  constructor(
    message: string,
    public code?: number,
    public cookie?: boolean // if the exception is caused by cookie
  ) {
    super(message)
  }
}
