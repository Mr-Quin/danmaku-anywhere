import { describe, expect, it } from 'vitest'
import { BackupFileError } from '@/common/backup/BackupFileError'
import { RpcException } from '@/common/rpc/types'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import {
  describeBackupImportError,
  describeRestoreProblems,
} from './backupImportMessages'

/**
 * Messages shown after a settings restore. A partial restore names the failed
 * stores by their translated page names rather than their storage ids, and a
 * file that cannot be restored at all gets a translated explanation instead of
 * the validation output, even after the error has crossed the RPC boundary.
 * The i18n mock returns keys, so assertions compare translation keys.
 */

function acrossRpc(error: Error): RpcException {
  return new RpcException(error.message, {
    cause: deserializeError(serializeError(error)),
  })
}

describe('describeRestoreProblems', () => {
  it('names failed stores by their translated page names', () => {
    const message = describeRestoreProblems({
      success: false,
      details: {
        danmakuOptions: { success: false, error: 'bad' },
        mountConfig: { success: true, droppedEntries: 2 },
        providerConfig: { success: true, droppedEntries: 0 },
      },
    })

    expect(message).toMatch(
      /^tabs\.style.+optionsPage\.backup\.droppedEntries$/
    )
    expect(message).not.toMatch(/danmakuOptions|mountConfig|providerConfig/)
  })

  it('says how many entries of a store were skipped and why', () => {
    const message = describeRestoreProblems({
      success: false,
      details: {
        providerConfig: {
          success: true,
          droppedEntries: 2,
          dropped: [
            { id: 'home', reason: 'baseUrl: Not a valid URL' },
            { reason: 'Could not be migrated' },
          ],
        },
      },
    })

    expect(message).toBe('optionsPage.backup.droppedEntriesWithReasons')
  })

  it('falls back to the id for a store it does not know', () => {
    const message = describeRestoreProblems({
      success: false,
      details: { someNewStore: { success: false } },
    })

    expect(message).toBe('someNewStore')
  })
})

describe('describeBackupImportError', () => {
  it.each([
    ['notJson', 'optionsPage.backup.error.notJson'],
    ['invalidFormat', 'optionsPage.backup.error.invalidFormat'],
    ['unsupportedVersion', 'optionsPage.backup.error.unsupportedVersion'],
  ] as const)('explains a %s file without the raw detail', (problem, key) => {
    const error = acrossRpc(
      new BackupFileError(problem, 'Invalid backup format: ✖ expected object')
    )

    expect(describeBackupImportError(error)).toBe(key)
  })

  it('keeps the message of an unexpected failure', () => {
    const error = acrossRpc(new Error('storage quota exceeded'))

    expect(describeBackupImportError(error)).toBe(
      'optionsPage.backup.importError: storage quota exceeded'
    )
  })
})
