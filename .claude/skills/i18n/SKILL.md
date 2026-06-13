---
name: i18n
description: Use when adding or changing user-facing strings in the extension (i18n.t calls or locale JSON) under packages/danmaku-anywhere. Surfaces the extract workflow and footguns so the change does not fail the i18n CI check or ship an untranslated or inconsistent string.
---

# i18n

Workflow for translation changes in `packages/danmaku-anywhere`. The package `AGENTS.md` "Gotchas" has the short version; this is the checklist.

The committed locale JSON (`src/common/localization/locales/{en,zh}/translation.json`) is the source of truth. `i18next-cli extract` seeds **new** keys and owns sorting and pruning, but it **never overwrites an existing value**, so changing copy means editing the JSON directly. CI runs `extract --ci` (`pnpm i18n:check`) and fails when the committed JSON does not match what extraction produces (missing key, unsorted, unused key).

## Workflow

1. **New string** is added via `i18n.t` with a literal key and an English default, then registered with extract:
   ```ts
   i18n.t('infoPanel.state.idle', 'No danmaku mounted')
   ```
   ```bash
   cd packages/danmaku-anywhere && pnpm i18n extract
   ```
   Extract adds the key to `en` (from your default) and `zh`, sorted. Then translate the new `zh` entry in the JSON.

2. **Changing existing English copy** means editing `en/translation.json` directly. Extract does not pick up a changed default on an already-extracted key, so the `i18n.t` default and the JSON drift unless you edit the JSON.

3. **Translating or editing `zh`** means editing `zh/translation.json` directly (extract preserves existing values, it does not translate).

4. **Keys must be static string literals** so the extractor finds them: no template strings, computed keys, or runtime concatenation. For per-state or per-enum strings, enumerate them as literal keys in a lookup (see `panelView.ts` / `entryView.ts`, the "Literal i18n keys per state" pattern).

5. **Validate** with `pnpm i18n:check` (the same `extract --ci` CI runs). Must be clean before committing.

## Footguns

- **Extract never overwrites existing values.** A changed `en` string or a `zh` translation lives in the JSON, not in the `i18n.t` call; editing only the source default leaves the JSON (and the UI) unchanged.
- **No em dashes (U+2014) in any string, including `zh`.** Use a period, comma, colon, or parentheses. This is a repo-wide rule.
- **Terminology consistency.** Match existing `zh` vocabulary. Known glossary: "mount" is 装填 (已装填, 装填弹幕), not 加载 or 挂载. Grep the `zh` JSON for an existing term before coining a new one.
- **`i18n:check` validates key sets, not translation quality.** It will not catch a `zh` entry left in English or an `en` default that drifted from the JSON. That is on you.
