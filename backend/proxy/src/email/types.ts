/**
 * Abstraction for sending transactional emails.
 * Keeps the app decoupled from a specific provider (e.g. Resend).
 */

export interface SendEmailParams {
  /** Recipient address(es) */
  to: string | string[]
  /** Email subject */
  subject: string
  /** Plain text body (optional if html is set) */
  text?: string
  /** HTML body (optional if text is set) */
  html?: string
}

export interface EmailService {
  send(params: SendEmailParams): Promise<void>
}
