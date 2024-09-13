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

Danmaku, also known as bullet comments or barrage comments, is a form of user-generated commentary that overlays a
video.

If you are familiar with vertical-scrolling chat rooms such as Twitch chat, danmaku is similar but with the comments
being displayed on the video itself.

[Wikipedia page](https://en.wikipedia.org/wiki/Danmaku_subtitling)

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

![Plex](./assets/screenshot_plex.png)

Jellyfin

![Jellyfin](./assets/screenshot_jellyfin.png)

YouTube

![YouTube](./assets/screenshot_youtube.png)

## Installation

Download the [latest release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest) for your browser.

Extract the archive to a folder.

> [!IMPORTANT]
> This folder should not be deleted except to uninstall the extension.

To update the extension, extract the newer release to the same folder and overwrite everything.

### Chrome

Install from
the [Chrome Web Store](https://chromewebstore.google.com/detail/danmaku-anywhere/jnflbkkmffognjjhibkjnomjedogmdpo?authuser=1&hl=en)

#### Manual installation

> [!NOTE]
> Installing from the store is recommended as it will automatically update the extension. But if you are unable to
> install from the store, you can install manually using the following steps.

1. Download the [latest release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest) for your browser.
2. Extract the archive to a folder. This folder should not be deleted except to uninstall the extension.
3. Goto the extensions page [chrome://extensions/](chrome://extensions/) and enable developer mode.
4. Click on "Load unpacked" and select the extracted folder
5. To update, overwrite the folder with the newer release, then click on the "Reload" button on the extensions page.

### Firefox

The Firefox version has limited support. The extension has fewer features and may not work as expected.

Using Firefox, download the Firefox version from [here](https://mr-quin.github.io/danmaku-anywhere/), it should prompt
you to install.

#### Manual installation

Manual installation only works for certain versions of Firefox.
See [here](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/#unlisted-addons)

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
  - URL Patterns: Enter the website's match pattern (
    e.g., `https://your.website.com/*`).
    - [Learn more about match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)
    - For websites using `iframe` for its video player, the match pattern should be based on the `iframes`'s `src`
      attribute.
  - Video element: Enter the video
    player's [CSS selector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) (often
    just `video`,
    unless the website has multiple video players).

### 2. Search for danmaku (Manual Mode or Ad-Hoc Use)

> [!NOTE]
> For most shows, searching in English will not work. Trying using the Japanese or Chinese title.

- In the extension's popup window, go to the "Search" tab.
- Enter the title and click on Search. (The Episode field should usually be left empty).
- In the results list, expand a result and click on each episode to download danmaku for that episode.

### 3. Mount danmaku (Manual Mode or Ad-Hoc Use)

> [!NOTE]
> You should be able to see the extension's floating button (a blue circle) on the page. If not, check if your mount
> config is correct before proceeding

- In the extension's popup window, go to the "Mount" tab.
- Select an episode in the dropdown selector, then click "Mount" to mount it over the video
- In manual mode, you'll need to repeat the steps above when the episode changes

### Automatic Mode

In automatic mode, the extension will parse the currently playing show and try to find matching danmaku. Automatic mode
can be turned off at anytime from the speed dial button.

Automatic mode requires manual integration with each website. Feel free to submit a feature request if you
want automatic mode for a specific website.

Below are the instruction for each integration.

#### Plex

In the Mount Config editor, select Plex from the integration dropdown.

- The extension uses the name and episode number of the currently playing media to match danmaku, so please make sure
  you library metadata is accurate.
- The extension cannot distinguish between videos and non-video contents (such as music), so please disable danmaku
  first before playing non-video content.

### Custom Danmaku

You can import custom danmaku by clicking on the "Import" button in the "Danmaku List" tab.

Custom danmaku adhere to the following format:

```typescript
interface CustomComment {
  mode?: 'ltr' | 'rtl' | 'top' | 'bottom' // default 'ltr'
  time: number // the time in seconds the comment should appear
  color: string // hex color code
  text: string // the comment text
}

interface CustomDanmaku {
  comments: CustomComment[] // at least one comment is required
  animeTitle: string
  // One of the following is required
  episodeTitle?: string
  episodeNumber?: number
}

type CustomDanmakuList = CustomDanmaku[]
```

Example

```json
[
  {
    "comments": [
      {
        "mode": "rtl",
        "time": 10,
        "color": "#FF5733",
        "text": "Hello World"
      }
    ],
    "animeTitle": "Anime Title",
    "episodeTitle": "Episode Title"
  }
]
```

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

### Building the extension

The output are in `packages/danmaku-anywhere/package`

**Chrome**

```bash
# packages/danmaku-anywhere
pnpm package
```

**Firefox**

```bash
# packages/danmaku-anywhere
pnpm package:firefox
```
