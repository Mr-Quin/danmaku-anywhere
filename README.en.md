<div align="center">
  <img width="128" height="128" src="./assets/logo.png">
  <h1>
    Danmaku Anywhere
  </h1>
</div>

> A browser extension that injects danmaku (bullet comments) into any website with a video player.

[中文](./README.md) [English]

For the userscript plex-danmaku, see [here](./packages/plex-danmaku).

## Wait, what is danmaku?

[Wikipedia page](https://en.wikipedia.org/wiki/Danmaku_subtitling)

You know Twitch chat or Youtube Live chat, where scrolling comments are displayed next to the video?

Imagine that, but the comments are overlaid on top of the video and flying across the screen.

## Features 🚧

- Search for danmaku by anime
- Inject danmaku into any video with customizable configuration
- Customizable danmaku style
- Cache danmaku locally and export to file

All danmaku is sourced from [弹弹play](https://www.dandanplay.com/)

## Installation

Download the latest [latest release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)

### Chrome

1. Goto the extensions page [chrome://extensions/](chrome://extensions/) and enable developer mode.
2. Click on "Load unpacked" and select the extracted folder

This extension has only been tested on Chrome in desktop mode

## Usage

This extension offers two operating modes:

### Manual mode:

- Works on any website.
- Requires you to search for danmaku by show.
- Manually add/remove (mount/unmount) danmaku when switching shows/episodes.

### Automatic mode:

- Currently available only on websites with specific integration (like [Plex](https://www.plex.tv/), including self-hosted installations).
- Automates all the steps involved in manual mode.

## Getting started

### 1. Configure Where to Load Danmaku (Mount Config)

- In the extension's popup window, go to the "Config" tab.
- Option A: If your website is in the predefined list, enable the corresponding entry.
- Option B: If your website isn't listed:
  - Click "add" to create a new entry.
  - Patterns: Enter the website's match pattern (e.g., `https://your.website.com/*`). [Learn more about match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).
  - Video query: Enter the video player's [selector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) (often just `video`).
  - Name your config and enable it.

### 2. Grant Permissions

- The extension will ask for permission to work on your chosen website. This is essential for functionality.
- You can revoke permission later by deleting the config or via the extension's Options page.

### 3. Search and Add Danmaku (Manual Mode or Ad-Hoc Use)

> [!TIP]
> Automatic mode does this for you

- Under the "Search" tab, find your desired anime by title.
- Click the episodes you want danmaku for. (Clicking an episode with existing danmaku will update it.)
- Select an episode in the Episode Selector, then click "Mount" to overlay danmaku on the video.
- Use "Unmount" to remove danmaku.

If the extension is working, you should see a floating button show up on the website.

### Turning off the extension

- Global 'Enabled' toggle: Turns off the extension across all pages. This option is also available in the right-click context menu.
- 'Show Danmaku' toggle (Styles tab): Visually hides danmaku.
- 'Enable' checkbox (Mount Config): Complete removes the extension from the configured page. Requires a page refresh to take effect.

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

3. Start the dev server

   ```bash
   # packages/danmaku-anywhere
   pnpm dev
   ```

4. The dev build is in `packages/danmaku-anywhere/dist`, load this folder as unpacked extension
