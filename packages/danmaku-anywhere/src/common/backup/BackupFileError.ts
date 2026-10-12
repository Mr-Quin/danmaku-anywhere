export type BackupFileProblem =
  | 'notJson'
  | 'invalidFormat'
  | 'unsupportedVersion'

const BACKUP_FILE_PROBLEMS: readonly BackupFileProblem[] = [
  'notJson',
  'invalidFormat',
  'unsupportedVersion',
]

const BACKUP_FILE_ERROR_NAME = 'BackupFileError'

// Thrown before any store is touched. Callers across the RPC boundary get a
// plain Error back, so they match on the name and problem, not instanceof.
export class BackupFileError extends Error {
  constructor(
    readonly problem: BackupFileProblem,
    message: string
  ) {
    super(message)
    this.name = BACKUP_FILE_ERROR_NAME
  }
}

function isBackupFileProblem(value: unknown): value is BackupFileProblem {
  return BACKUP_FILE_PROBLEMS.some((problem) => problem === value)
}

export function getBackupFileProblem(
  error: unknown
): BackupFileProblem | undefined {
  for (let current = error; current instanceof Error; ) {
    if (
      current.name === BACKUP_FILE_ERROR_NAME &&
      'problem' in current &&
      isBackupFileProblem(current.problem)
    ) {
      return current.problem
    }
    current = current.cause
  }
  return undefined
}
