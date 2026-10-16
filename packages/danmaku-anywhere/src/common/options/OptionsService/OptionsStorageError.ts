// These names are stored, in the upgrade run record and in a restore result,
// so renaming one strands the records already written.
export type OptionsStorageProblem =
  // One stored item would pass the browser's per-item limit
  | 'options.itemTooLarge'
  // The storage area is out of bytes or items
  | 'options.storeFull'
  | 'options.writeRateLimited'
  // A store split over several items is missing some of them or they do not
  // match, as while another device's write is still syncing in
  | 'options.incomplete'

const OPTIONS_STORAGE_PROBLEMS: readonly OptionsStorageProblem[] = [
  'options.itemTooLarge',
  'options.storeFull',
  'options.writeRateLimited',
  'options.incomplete',
]

export class OptionsStorageError extends Error {
  constructor(
    readonly problem: OptionsStorageProblem,
    readonly store: string,
    options?: { cause?: unknown }
  ) {
    const detail =
      options?.cause instanceof Error ? `: ${options.cause.message}` : ''
    super(`${problem} in ${store}${detail}`, options)
    this.name = 'OptionsStorageError'
  }
}

export function isOptionsStorageProblem(
  value: unknown
): value is OptionsStorageProblem {
  return OPTIONS_STORAGE_PROBLEMS.some((problem) => problem === value)
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
    return 'options.itemTooLarge'
  }
  if (/MAX_WRITE_OPERATIONS|WriteOperationsPer/i.test(message)) {
    return 'options.writeRateLimited'
  }
  if (/QuotaBytes|QUOTA_BYTES|MaxItems|MAX_ITEMS|quota/i.test(message)) {
    return 'options.storeFull'
  }
  return undefined
}
