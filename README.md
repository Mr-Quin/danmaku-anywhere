# danmaku-anywhere

For the userscript plex-danmaku, see [here](./packages/plex-danmaku).

Danmaku Anywhere is a browser extension to inject danmaku into any webpage with a `<video>` player.

## Features

| Feature                                     | Status         |
|---------------------------------------------|----------------|
| UI to search for Danmaku                    | ✅ Done         |
| UI to manually mount/unmount Danmaku        | ✅ Done         |
| Declarative mounting configuration          | ⚙️ In Progress |
| Configurable Danmaku style                  | ⚙️ In Progress |
| Site-Specific Integration:                  | 📅 Planned     |
| - Video lifecycle detection                 |                |
| - Auto-detection of currently playing video |                |
| - Automatic Danmaku fetching                |                |
| - Injection of site-specific control UI     |                |

Currently wip, but it's usable.

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
