import type { z } from 'zod'
import { zIntegrationPolicyV3, zIntegrationV3 } from './migrations/v3.js'

export type IntegrationPolicy = z.infer<typeof zIntegrationPolicyV3>

export type IntegrationInput = z.input<typeof zIntegrationV3>

export type Integration = z.output<typeof zIntegrationV3>

export const zIntegration = zIntegrationV3
export const zIntegrationPolicy = zIntegrationPolicyV3
