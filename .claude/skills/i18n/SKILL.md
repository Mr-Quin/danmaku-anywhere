---
name: i18n
description: Use when adding or changing user-facing strings in the extension (i18n.t calls or locale JSON) under packages/danmaku-anywhere. Surfaces the extract workflow and footguns so the change does not fail the i18n CI check or ship an untranslated or inconsistent string.
---

# i18n

Canonical workflow for translation changes in `packages/danmaku-anywhere`. The package `AGENTS.md` "Gotchas" has the short version; this is the checklist. CI runs `i18next-cli extract --ci` (`pnpm i18n:check`) and fails the build when the committed JSON does not match what extraction produces, so the locale JSON is generated, not hand-edited.

## Workflow

1. **Add the string via `i18n.t` with a literal key and an English default:**
   ```ts
   i18n.t('infoPanel.state.idle', 'No danmaku mounted')
   ```
   The English default (2nd arg) is the source of truth the extractor writes to the `en` JSON.

2. **Keys must be static string literals.** The extractor parses them statically: no template strings, computed keys, or runtime concatenation. For per-state or per-enum strings, enumerate them as literal keys in a lookup (see `panelView.ts` / `entryView.ts`, the "Literal i18n keys per state" pattern).

3. **Run the extractor; do not hand-edit the JSON:**
   ```bash
   cd packages/danmaku-anywhere && pnpm i18n extract
   ```
   It regenerates `src/common/localization/locales/{en,zh}/translation.json`: adds new keys, sorts them, removes unused ones. Existing translations are preserved.

4. **Translate the new `zh` entries.** Extract adds the keys for you to fill; do not leave them as the English default.

5. **Validate:** `pnpm i18n:check` (the same `extract --ci` CI runs). Must be clean before committing.

## Footguns

- **No em dashes (U+2014) in any string, including `zh`.** Use a period, comma, colon, or parentheses. This is a repo-wide rule.
- **Terminology consistency.** Match existing `zh` vocabulary. Known glossary: "mount" is 装填 (已装填, 装填弹幕), not 加载 or 挂载. Grep the `zh` JSON for an existing term before coining a new one.
- **Do not hand-place keys into the JSON.** Sorting and key presence are owned by `extract`; manual edits drift from what `--ci` expects and fail CI.
- **`i18n:check` validates key sets, not translation quality.** It will not catch a `zh` entry left in English. That is on you in step 4.
