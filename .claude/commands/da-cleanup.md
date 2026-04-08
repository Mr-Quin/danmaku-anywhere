---
name: da-cleanup
description: Use to clean up worktrees whose ClickUp tasks are completed — removes worktree dirs and local branches
---

# da-cleanup — Worktree Cleanup

Cleans up worktrees for completed tasks in one pass.

## Steps

1. **List worktrees** matching the `danmaku-anywhere-DA-*` pattern:

```bash
git worktree list
```

2. **Extract DA-XXX IDs** from worktree directory names.

3. **Check each task's status** in ClickUp via `clickup_get_task`. If the task status is "complete" or "closed", the worktree is eligible for cleanup.

4. **For each completed task**, remove the worktree and local branch:

```bash
git worktree remove ../danmaku-anywhere-DA-XXX
git branch -d DA-XXX_description
```

Remote branches are auto-deleted by GitHub's "delete branch after merge" setting.

5. **Clean up Claude Code settings** for each removed worktree:

- Read `~/.claude/settings.json`
- Remove any `additionalDirectories` entries whose path references the removed worktree
- Remove any `Read(...)` allow rules whose path references the removed worktree
- Write the updated settings back

6. **Report** what was cleaned up and what was kept (with task status).
