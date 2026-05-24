# Legacy POMs: v1.5.0

Page objects for v1.5.0's popup, frozen against that release's UI. Used
only by migration specs to seed real user state from outside the SW.

Do not refactor when current UI changes; this is a snapshot.

Current contents: `MigrationLegacyPopup` with `restoreBackup()` and
`importDanmaku()` — the two file-upload flows the smoke needs.
