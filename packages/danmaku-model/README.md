# @danmaku-anywhere/danmaku-model

The shared danmaku data model: comment, episode, season, bookmark and provider schemas, migrations between their stored versions, backup parsing, and conversion to and from XML.

## Usage

Consumed by `danmaku-engine`, `danmaku-provider`, `extension-protocol`, the extension and the web app. Main entry: `src/index.js` / `src/index.d.ts`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm build` | Compile with tsgo |
| `pnpm test` | Vitest |
| `pnpm dev` | Watch build |

## Dependencies

- `xml-js`, `zod`
