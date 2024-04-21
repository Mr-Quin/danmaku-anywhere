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

You know Twitch chat or YouTube Live chat, where scrolling comments are displayed next to the video?

Imagine that, but the comments are overlaid on top of the video and flying across the screen.

## Features

- Search for danmaku by anime
- Inject danmaku into any video with customizable configuration
- Customizable danmaku style
- Cache danmaku locally and export to file
- Automatically search for danmaku for the currently playing video🚧

All danmaku is sourced from [弹弹play](https://www.dandanplay.com/)

## Screenshots

![UI](./assets/ui_tour.gif)

Plex

![Plex](./assets/danmaku_plex.png)

Crunchyroll

![Crunchyroll](./assets/danmaku_crunchyroll.png)

## Installation

Download the [latest release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)

Extract the archive to a folder.

> [!IMPORTANT]
> This folder should not be deleted except to uninstall the extension.

To update the extension, extract the newer release to the same folder and overwrite everything.

### Chrome

1. Goto the extensions page [chrome://extensions/](chrome://extensions/) and enable developer mode.
2. Click on "Load unpacked" and select the extracted folder

**To update**: Go to the extension page and click on the reload button after the new release is extracted

### Firefox

The extension has not been tested on Firefox at all, so it may or may not work.

Firefox support is planned for the 1.0.0 release.

## Usage

This extension has two operating modes:

- Manual Mode: Requires you to search for danmaku and manually mount them. Works on every website.
- Automatic Mode: Automatically searches for and mounts danmaku. Requires integration with each supported website.
  Currently only works on [Plex](https://www.plex.tv/).

### 1. Configure Where to Load Danmaku (Mount Config)

- In the extension's popup window, go to the "Config" tab.
- If your website is in the predefined list, enable it.
- If your website isn't listed:
  - Click "add" to create a new entry.
  - Patterns: Enter the website's match pattern (
    e.g., `https://your.website.com/*`). [Learn more about match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).
    For websites using `iframe` for its video player, the match pattern should be based on the `iframes`'s `src`
    attribute.
  - Video query: Enter the video
    player's [selector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) (often just `video`,
    unless the website has multiple video players).
  - Name: Enter a unique name for the config. The name cannot be changed later, but you can delete and recreate the
    config with a different name.

### 2. Search for danmaku (Manual Mode or Ad-Hoc Use)

> [!NOTE]
> For most shows, searching in English will not work. Trying using the Japanese or Chinese title.

- In the extension's popup window, go to the "Search" tab.
- Enter the title and click on Search. (The Episode field should usually be left empty).
- In the results list, expand a result and click on each episode to download danmaku for that episode.

### 3. Mount danmaku (Manual Mode or Ad-Hoc Use)

> [!NOTE]
> You should be able to see the extension's floating button (a blue circle) on the page. If not, check if your mount config is correct before proceeding

- In the extension's popup window, go to the "Mount" tab.
- Select an episode in the dropdown selector, then click "Mount" to mount it over the video
- In manual mode, you'll need to repeat the steps above when the episode changes

### Turning off the extension

- Global 'Enabled' toggle: Turns off the extension across all pages. This option is also available in the right-click
  context menu.
- 'Show Danmaku' toggle (Styles tab): Visually hides danmaku.
- 'Enable' checkbox (Mount Config): Complete removes the extension from the configured page. Requires a page refresh to
  take effect.

## Development

### Prerequisites

This is a pnpm monorepo. You'll need to install [pnpm](https://pnpm.io/installation) first.

### Project structure

```
.
├── packages
│   ├── danmaku-anywhere       # the browser extension package
│   ├── danmaku-engine         # wrapper for danmaku engine
│   ├── plex-danmaku           # legacy userscript for plex
|   └── dandanplay-api         # handles interacting with dandanplay's api
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
