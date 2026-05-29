---
name: specs-in-clickup
description: Use when finishing a brainstorm, writing a design spec, or producing an implementation plan in this project. Directs the output to ClickUp as a doc on the DA-XXX task instead of saving to the repo or local disk.
---

# specs-in-clickup

Brainstorm outputs, design specs, and implementation plans live as **ClickUp docs** linked from the owning DA-XXX task. Not in the repo (`docs/superpowers/specs/`, `.specs/`), not in agent auto-memory long-term. The ClickUp task is the single source of truth; repo-tracked specs go stale, local-only specs vanish with the worktree.

## Prerequisites

- ClickUp MCP (`clickup_*` tools)
- `CLICKUP_DA_SPACE_ID` set in the environment (the developer exports it in their shell, e.g. `~/.zshenv`; see `da-dev` step 1)

If either is missing, stop and tell the human. Don't fall back to committing the spec to the repo. Never hardcode IDs in tracked files.

## How to apply

After `superpowers:brainstorming`, `superpowers:writing-plans`, or anything that produces a spec/plan:

1. **Find or create the related ClickUp task.** `da-dev` step 1 does this. Note the DA-XXX ID.
2. **Search for an existing doc** before creating a new one. `clickup_search` with `filters: { asset_types: ['doc'] }` covers names and contents; `clickup_get_task_comments` covers links posted to the task. Iterate via `clickup_update_document_page` rather than recreate.
3. **Create the doc at space level.** Tasks cannot be doc parents; list-level docs (`type: "6"`) surface as views inside the list. Resolve `<space_id>` from `$CLICKUP_DA_SPACE_ID`.
   ```
   clickup_create_document(
     name: "Spec: <topic>",
     parent: { id: <space_id>, type: "4" },
     visibility: <project default>,
     create_page: false
   )
   ```
4. **Add the first page:**
   ```
   clickup_create_document_page(
     document_id: <new doc id>,
     name: "Design",   // or "Plan", "Notes"
     content: <markdown>
   )
   ```
   Multi-section specs use further `clickup_create_document_page` calls. One doc per task; multiple pages within.
5. **Link the doc to the task** with a comment containing the URL (`clickup_create_task_comment`). There is no single-call attach.

## Override defaults that write to disk

If `superpowers:brainstorming` / `superpowers:writing-plans` (or anything else) tries to write into `docs/superpowers/specs/`, `docs/superpowers/plans/`, or `.specs/`, send the output to ClickUp instead. If a draft already exists on disk, push it to ClickUp and delete the local copy in the same step.

The doc URL belongs on the ClickUp task, not in the PR body. The PR title's DA-XXX auto-links the task.
