# danmaku-anywhere

For the userscript plex-danmaku, see [here](./packages/plex-danmaku).

Danmaku Anywhere is a browser extension to inject danmaku into any webpage with a `<video>` player.

## Features

| Feature                              | Status         |
| ------------------------------------ | -------------- |
| UI to search for Danmaku             | ✅ Done        |
| UI to manually mount/unmount Danmaku | ✅ Done        |
| Declarative mounting configuration   | ✅ Done        |
| Configurable Danmaku style           | ✅ Done        |
| Site-Specific Integration:           | ⚙️ In Progress |
| - Video lifecycle detection          | ⚙️ In Progress |
| - Feedback UI                        | ⚙️ In Progress |
| - Automatic Danmaku fetching         | ✅ Done        |

## Usage

Find the latest release [here](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest).
Download the unpacked extension and load it into your browser (Chromium only).

## Screenshots

Plex

![Plex](./assets/danmaku_plex.png)

Crunchyroll

![Crunchyroll](./assets/danmaku_crunchyroll.png)

Billibili

![Billibili](./assets/danmaku_bilibili.png)

Control panel

![Search panel](./assets/danmaku_search.png)
![Control panel](./assets/danmaku_control.png)

## Development

This is a pnpm monorepo.

### Install dependencies

In the root directory:

```bash
pnpm i
```

### Build shared libraries

In the root directory:

```bash
pnpm build
```

Now you can go to each package and run `pnpm dev` to start developing.
