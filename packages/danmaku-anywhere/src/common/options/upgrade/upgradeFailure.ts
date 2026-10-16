import {
  AppError,
  type UpgradeProblem,
  zUpgradeProblem,
} from '@/common/errors/AppError'
import { storageProblemOf } from '../OptionsService/storageProblem'

export type { UpgradeProblem }

// Why one store could not be upgraded. store is the store's storage key.
export interface StoreFailure {
  store: string
  problem: UpgradeProblem
}

// Problems that fail the same way on every attempt until something changes
// what is stored.
const REPEATING_PROBLEMS: readonly UpgradeProblem[] = [
  'options.itemTooLarge',
  'options.storeFull',
  'options.migration',
]

// The error of each store goes in the cause, for the log.
export function upgradeFailedError(
  failures: StoreFailure[],
  errors: unknown[]
): AppError<'options.upgradeFailed'> {
  return new AppError(
    'options.upgradeFailed',
    { stores: failures },
    {
      message: `Failed to upgrade options: ${failures.map((f) => f.store).join(', ')}`,
      cause: new AggregateError(errors),
    }
  )
}

export function toStoreFailure(store: string, error: unknown): StoreFailure {
  if (error instanceof AppError && error.code === 'options.migration') {
    return { store, problem: 'options.migration' }
  }
  return { store, problem: storageProblemOf(error) ?? 'unknown' }
}

export function storeFailuresOf(error: unknown): StoreFailure[] {
  if (error instanceof AppError && error.code === 'options.upgradeFailed') {
    return (error as AppError<'options.upgradeFailed'>).params.stores
  }
  return []
}

export function isRepeatingFailure(failures: readonly StoreFailure[]): boolean {
  return (
    failures.length > 0 &&
    failures.every((failure) => REPEATING_PROBLEMS.includes(failure.problem))
  )
}

// The failures as read back from storage, dropping anything malformed.
export function parseStoreFailures(value: unknown): StoreFailure[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) {
      return []
    }
    const { store, problem } = entry as Record<string, unknown>
    if (typeof store !== 'string') {
      return []
    }
    const parsed = zUpgradeProblem.safeParse(problem)
    return [{ store, problem: parsed.success ? parsed.data : 'unknown' }]
  })
}
