import { ResendEmailService } from './resend'
import type { EmailService } from './types'

export type { EmailService, SendEmailParams } from './types'

let emailService: EmailService | null = null

export async function getOrCreateEmailService(env: Env): Promise<EmailService> {
  if (emailService) {
    return emailService
  }

  const apiKey = await env.RESEND_API_KEY.get()
  const from = env.EMAIL_FROM.trim()

  emailService = new ResendEmailService(apiKey, from)
  return emailService
}
