# Agent context: packages/extension-protocol

## Purpose

Types and small helpers shared by the extension and the pages that message it (the web app). Meant to be published so the web app can use it from outside this repo.

## Gotchas

- Published the same way as `danmaku-model`: `main`/`types` point at `src/index.ts` in this repo, `publishConfig` points the packed package at `dist`, and `zod` is a peer dependency.
- Keep it free of `chrome.*` and of extension-only code; that belongs in `web-scraper` or the extension.
- Message shapes, action names, source strings and the `da-ext-version`/`da-ext-id` attribute names are a wire format. Installed extensions can be older or newer than the web app, so change them only in a backward compatible way.
