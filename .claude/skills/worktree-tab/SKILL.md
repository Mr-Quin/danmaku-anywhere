---
name: worktree-tab
description: Use to open a fresh Claude session in a new terminal tab for a da-dev worktree, after `scripts/da-bootstrap.mjs` prints its READY block. Covers Warp, Windows Terminal, and a manual fallback.
---

# worktree-tab

`scripts/da-bootstrap.mjs` ends with a `READY` block (`worktree=...`, `branch=...`, `task_file=...`, `title=...`). Parse those, then open a new terminal tab in the worktree running a fresh Claude session:

```bash
claude --permission-mode acceptEdits --add-dir . -- "Read <task_file> and follow the instructions"
```

How you open the tab depends on the terminal you're in (`$TERM_PROGRAM`). Substitute `<worktree>`, `<task_file>`, `<title>`, and the task id (`DA-XXX`) from the `READY` block throughout.

## Warp

Write a tab config, then open it by deeplink. Tab configs live in `~/.local/share/warp-terminal/tab_configs/` (Linux), `~/.warp/tab_configs/` (macOS), or `%APPDATA%\warp\Warp\data\tab_configs\` (Windows). Write `DA-XXX.toml` with two side-by-side panes both in the worktree, claude on the left and a free terminal on the right:

```toml
name = "<title>"
title = "<title>"

[[panes]]
id = "root"
split = "horizontal"
children = ["left", "right"]

[[panes]]
id = "left"
type = "terminal"
directory = "<worktree>"
commands = ['claude --permission-mode acceptEdits --add-dir . -- "Read <task_file> and follow the instructions"']
is_focused = true

[[panes]]
id = "right"
type = "terminal"
directory = "<worktree>"
```

Then fire `warp://tab_config/DA-XXX`. On macOS use `open '<uri>'`; on Windows use `start <uri>`. On Linux the Warp launcher drops the deeplink, so hand it to the app over D-Bus:

```bash
gdbus call --session --dest dev.warp.Warp --object-path /dev/warp/Warp \
  --method org.freedesktop.Application.Open "['warp://tab_config/DA-XXX']" "{}"
```

## Windows Terminal (no Warp)

```
wt new-tab --title '<title>' -d '<worktree>' -- powershell -NoExit -Command "claude --permission-mode acceptEdits --add-dir . -- 'Read <task_file> and follow the instructions'"
```

## Other terminals

Open a tab in `<worktree>` and run the `claude ...` line yourself.
