export type OptionsStorageProblem =
  // One stored item would pass the browser's per-item limit
  | 'itemTooLarge'
  // The storage area is out of bytes or items
  | 'storeFull'
  | 'writeRateLimited'
  // A store split over several items is missing some of them or they do not
  // match, as while another device's write is still syncing in
  | 'incomplete'

const OPTIONS_STORAGE_PROBLEMS: readonly OptionsStorageProblem[] = [
  'itemTooLarge',
  'storeFull',
  'writeRateLimited',
  'incomplete',
]

const OPTIONS_STORAGE_ERROR_NAME = 'OptionsStorageError'

// Callers across the RPC boundary get a plain Error back, so they match on the
// name and problem, not instanceof.
export class OptionsStorageError extends Error {
  constructor(
    readonly problem: OptionsStorageProblem,
    readonly store: string,
    options?: { cause?: unknown }
  ) {
    const detail =
      options?.cause instanceof Error ? `: ${options.cause.message}` : ''
    super(`Options storage error (${problem}) in ${store}${detail}`, options)
    this.name = OPTIONS_STORAGE_ERROR_NAME
  }
}

export function isOptionsStorageProblem(
  value: unknown
): value is OptionsStorageProblem {
  return OPTIONS_STORAGE_PROBLEMS.some((problem) => problem === value)
}

export function getOptionsStorageError(
  error: unknown
): { problem: OptionsStorageProblem; store: string } | undefined {
  for (let current = error; current instanceof Error; ) {
    if (
      current.name === OPTIONS_STORAGE_ERROR_NAME &&
      'problem' in current &&
      isOptionsStorageProblem(current.problem) &&
      'store' in current &&
      typeof current.store === 'string'
    ) {
      return { problem: current.problem, store: current.store }
    }
    current = current.cause
  }
  return undefined
}

// Chrome words these as "Resource::kQuotaBytesPerItem quota exceeded" (older
// builds "QUOTA_BYTES_PER_ITEM quota exceeded") and "This request exceeds the
// MAX_WRITE_OPERATIONS_PER_MINUTE quota."; Firefox reports every sync quota
// as "storage.sync API call exceeded its quota limitations".
export function classifyStorageFailure(
  error: unknown
): OptionsStorageProblem | undefined {
  const message = error instanceof Error ? error.message : String(error)
  if (/QuotaBytesPerItem|QUOTA_BYTES_PER_ITEM/i.test(message)) {
    return 'itemTooLarge'
  }
  if (/MAX_WRITE_OPERATIONS|WriteOperationsPer/i.test(message)) {
    return 'writeRateLimited'
  }
  if (/QuotaBytes|QUOTA_BYTES|MaxItems|MAX_ITEMS|quota/i.test(message)) {
    return 'storeFull'
  }
  return undefined
}
