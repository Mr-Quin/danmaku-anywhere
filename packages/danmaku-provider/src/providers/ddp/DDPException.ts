export class DDPException extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
  }
}
