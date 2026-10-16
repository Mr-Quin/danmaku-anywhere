import { describe, expect, it } from 'vitest'
import { describeRestoreProblems } from './backupImportMessages'

/**
 * Messages shown after a settings restore. A partial restore names the failed
 * stores by their translated page names rather than their storage ids. The
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

    expect(message).toMatch(/^tabs\.style.+configPage\.name$/)
    expect(message).not.toMatch(/danmakuOptions|mountConfig|providerConfig/)
  })

  it('falls back to the id for a store it does not know', () => {
    const message = describeRestoreProblems({
      success: false,
      details: { someNewStore: { success: false } },
    })

    expect(message).toBe('someNewStore')
  })
})
