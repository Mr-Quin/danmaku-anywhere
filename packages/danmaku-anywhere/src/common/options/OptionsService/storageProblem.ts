import {
  AppError,
  OPTIONS_STORAGE_PROBLEMS,
  type OptionsStorageProblem,
} from '@/common/errors/AppError'

export function isOptionsStorageProblem(
  value: unknown
): value is OptionsStorageProblem {
  return OPTIONS_STORAGE_PROBLEMS.some((problem) => problem === value)
}

export function optionsStorageError(
  problem: OptionsStorageProblem,
  store: string,
  cause?: unknown
): AppError<OptionsStorageProblem> {
  return new AppError(problem, { store }, { cause })
}

// The storage problem an error reports, or undefined for any other failure
export function storageProblemOf(
  error: unknown
): OptionsStorageProblem | undefined {
  if (error instanceof AppError && isOptionsStorageProblem(error.code)) {
    return error.code
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
