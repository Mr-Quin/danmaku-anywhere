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

4. **For each completed task**, remove the worktree, the local branch, and the task notes file:

```bash
git worktree remove <worktree-path>
git branch -d DA-XXX_<hint>
rm -f ~/.claude/da-tasks/DA-XXX.md
```

Remote branches are auto-deleted by GitHub's "delete branch after merge" setting.

5. **Clean up Claude Code settings** for each removed worktree:

- Read `~/.claude/settings.json`
- Remove any `additionalDirectories` entries whose path references the removed worktree
- Remove any `Read(...)` allow rules whose path references the removed worktree
- Write the updated settings back

6. **Prune stale auto-memory** for each cleaned-up task:

- Locate the project's auto-memory directory under Claude's user-config tree (the platform-dependent path is owned by the Claude harness; resolve it from the environment rather than hardcoding here)
- Grep that directory for the cleaned task ID and any in-flight notes that referenced it
- For each match: read the file, decide whether the content has surviving general value (e.g. a still-true gotcha or lesson) or is purely in-flight state. Delete the file if it's purely in-flight; otherwise leave it and note the staleness
- Update `MEMORY.md` to remove entries for any files you deleted
- Skip `feedback_*` and `reference_*` files unless the task ID appears in their body; those are usually general rules, not task-state

7. **Report** what was cleaned up and what was kept (with task status), including which memory files were removed.
