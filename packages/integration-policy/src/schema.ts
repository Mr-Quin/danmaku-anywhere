import type { z } from 'zod'
import { zIntegrationPolicyV4, zIntegrationV4 } from './migrations/v4.js'

export type IntegrationPolicy = z.infer<typeof zIntegrationPolicyV4>

export type IntegrationInput = z.input<typeof zIntegrationV4>

export type Integration = z.output<typeof zIntegrationV4>

export const zIntegration = zIntegrationV4
export const zIntegrationPolicy = zIntegrationPolicyV4
