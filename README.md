# danmaku-anywhere

For the userscript plex-danmaku, see [here](./packages/plex-danmaku).

Browser extension to inject danmaku into any webpage with a `<video>` player.

Currently wip, somewhat working but not user friendly.

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
