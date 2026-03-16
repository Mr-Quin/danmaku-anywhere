import { Resend } from 'resend'
import type { EmailService, SendEmailParams } from './types'

/**
 * Resend implementation of the email service abstraction.
 * Only this file should import from 'resend' so the rest of the app stays provider-agnostic.
 */
export class ResendEmailService implements EmailService {
  private readonly resend: Resend
  private readonly from: string

  constructor(apiKey: string, from: string) {
    this.resend = new Resend(apiKey)
    this.from = from
  }

  async send(params: SendEmailParams): Promise<void> {
    const to = Array.isArray(params.to) ? params.to : [params.to]
    const html =
      params.html ??
      (params.text
        ? `<p>${params.text.replaceAll('\n', '<br>')}</p>`
        : '<p></p>')
    const text = params.text

    const payload: Parameters<Resend['emails']['send']>[0] = {
      from: this.from,
      to,
      subject: params.subject,
      html,
    }
    if (text) payload.text = text

    console.log('Sending email to', to)
    const { error, data } = await this.resend.emails.send(payload)

    if (error) {
      throw new Error(`Resend send failed: ${JSON.stringify(error)}`)
    }

    console.log('Email sent successfully', data)
  }
}
