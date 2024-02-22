# danmaku-anywhere

> A browser extension that injects danmaku into theoretically any website with a `<video>` player.

For the userscript plex-danmaku, see [here](./packages/plex-danmaku).

## Features 🚧

For all websites:

- Search for danmaku by anime
- Inject danmaku into any video with customizable configuration
- Customizable danmaku style
- Cache danmaku locally and export to file

And for websites with integration: 🚧

- Automatically detect the anime being played and match danmaku

Currently the only website with integration implemented is [Plex](https://www.plex.tv/)

All danmaku is sourced from [弹弹play](https://www.dandanplay.com/)

## Installation

Download the latest [latest release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)

### Chrome

1. Goto the extensions page [chrome://extensions/](chrome://extensions/) and enable developer mode.
2. Click on "Load unpacked" and select the extracted folder

This extension has only been tested on Chromium based browsers in desktop mode

## Screenshots

Plex

![Plex](./assets/danmaku_plex.png)

Crunchyroll

![Crunchyroll](./assets/danmaku_crunchyroll.png)

UI

![Search page](./assets/danmaku_search_page.png)
![Options page](./assets/danmaku_options_page.png)
![Floating panel](./assets/danmaku_floating_dialogue.png)

## Development

### Prerequisites

This is a pnpm monorepo. You'll need to install [pnpm](https://pnpm.io/installation) first.

### Project structure

```
.
├── packages
│   ├── danmaku-anywhere       # the browser extension package
│   ├── danmaku-engine         # wraps danmaku engine and dandanplay api
│   └── plex-danmaku           # legacy userscript for plex
├── package.json
└── ...
```

### Installation

1. Install dependencies

   ```bash
   # in the root dir
   pnpm i
   ```

2. Build shared libraries

   ```bash
   # in the root dir
   pnpm build
   ```

3. Build the extension in dev mode and start the dev server

   ```bash
   # packages/danmaku-anywhere
   pnpm dev
   ```

4. This the output is in `packages/danmaku-anywhere/dist`, load this folder as unpacked extension
