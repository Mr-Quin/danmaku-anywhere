---
'@danmaku-anywhere/danmaku-provider': minor
'@danmaku-anywhere/web-scraper': minor
---

Kazumi rules that search or list chapters through an API (`searchMode` / `chapterMode` set to `api`) now pass `zKazumiPolicy`, which exposes both modes and only requires the XPath selectors in xpath mode. `kazumiSearch` and `kazumiGetChapters` refuse api-mode rules with a clear error instead of opening a tab on an empty URL, and `isXPathPolicy` tells callers whether the scraper can run a rule.
