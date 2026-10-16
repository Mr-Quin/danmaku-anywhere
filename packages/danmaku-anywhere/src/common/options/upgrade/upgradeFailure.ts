import {
  isOptionsStorageProblem,
  OptionsStorageError,
  type OptionsStorageProblem,
} from '../OptionsService/OptionsStorageError'

export type UpgradeProblem = OptionsStorageProblem | 'unknown'

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
]

export class OptionsUpgradeError extends AggregateError {
  constructor(
    readonly failures: StoreFailure[],
    errors: unknown[]
  ) {
    super(
      errors,
      `Failed to upgrade options: ${failures.map((f) => f.store).join(', ')}`
    )
    this.name = 'OptionsUpgradeError'
  }
}

export function toStoreFailure(store: string, error: unknown): StoreFailure {
  return {
    store,
    problem: error instanceof OptionsStorageError ? error.problem : 'unknown',
  }
}

export function storeFailuresOf(error: unknown): StoreFailure[] {
  return error instanceof OptionsUpgradeError ? error.failures : []
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
    return [{ store, problem: isUpgradeProblem(problem) ? problem : 'unknown' }]
  })
}

function isUpgradeProblem(value: unknown): value is UpgradeProblem {
  return isOptionsStorageProblem(value) || value === 'unknown'
}
