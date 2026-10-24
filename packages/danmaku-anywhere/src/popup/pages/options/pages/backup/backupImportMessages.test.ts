import { describe, expect, it } from 'vitest'
import {
  describeMissingStores,
  describeRestoreProblems,
  describeRestoreStorageProblems,
} from './backupImportMessages'

/**
 * Messages shown after a settings restore. A partial restore names the failed
 * stores by their translated page names rather than their storage ids. A
 * store the browser's storage quota refused gets a sentence saying so. The
 * i18n mock returns keys, so assertions compare translation keys.
 */

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
            { id: 'home', label: 'Home', reason: 'invalidSettings' },
            { reason: 'notMigrated' },
          ],
        },
      },
    })

    expect(message).toBe('optionsPage.backup.droppedEntriesWithReasons')
  })

  it('names the settings a backup did not include', () => {
    expect(
      describeMissingStores({
        success: true,
        details: {},
        missing: ['localMatchingRule'],
      })
    ).toBe('optionsPage.backup.store.localMatchingRule')
  })

  it('falls back to the id for a store it does not know', () => {
    const message = describeRestoreProblems({
      success: false,
      details: { someNewStore: { success: false } },
    })

    expect(message).toBe('someNewStore')
  })
})

describe('describeRestoreStorageProblems', () => {
  it('explains each store the browser storage refused, and only those', () => {
    const sentences = describeRestoreStorageProblems({
      success: false,
      details: {
        danmakuOptions: {
          success: false,
          error: 'quota',
          storageProblem: 'options.storeFull',
        },
        mountConfig: { success: false, error: 'bad' },
        providerConfig: { success: true, droppedEntries: 0 },
      },
    })

    expect(sentences).toEqual(['optionsStorage.saveFailed'])
  })
})
