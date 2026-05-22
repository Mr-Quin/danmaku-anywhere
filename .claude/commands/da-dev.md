---
name: da-dev
description: Use when implementing features, fixing bugs, or making any code/config changes that need a PR — orchestrates the full dev workflow from ClickUp task to PR with review monitoring
---

# da-dev — Development Workflow

Task: $ARGUMENTS

Orchestrates: ClickUp task → branch → implement → verify → self-review → PR → review monitoring → human handoff.

## Step Details

### 1. ClickUp Task

Look up ClickUp workspace IDs (list ID, Type field ID, option IDs) from memory; ask the user if absent.

Explore for an existing match: `clickup_search` with nouns from the request, scoped to the Extension Tasks list. Scan recent activity if the search is too narrow. Multiple plausible hits → list and ask. None → create one and pick the Type based on the scope of the change. Grab the custom ID (`DA-XXX`).

### 2. Branch

Pick a `hint` — 2-4 kebab-case words describing the task (e.g. `dev-workflow`, `bilibili-cookie-fix`, `theme-redesign`). The same hint goes in both the branch name and the worktree directory so concurrent worktrees are recognisable at a glance — both in `git worktree list` and on disk.

```bash
git fetch origin master
# For features/fixes — use a worktree:
git worktree add ../danmaku-anywhere-DA-XXX-<hint> -b DA-XXX_<hint> origin/master
# For trivial changes — branch directly:
git checkout -b DA-XXX_<hint> origin/master
```

The `hint` is underscore-separated inside the branch (`DA-524_dev_workflow`) and dash-separated inside the worktree dir (`danmaku-anywhere-DA-524-dev-workflow`). When `pnpm dev:browser` is running, the extension UI surfaces the branch name so you can tell which worktree's build is loaded.

Reuse an existing worktree if its previous work is already done.

### 2a. Worktree Setup

After creating a worktree, perform these setup steps:

**Copy environment files** — gitignored files are not shared between worktrees:

```bash
for f in packages/danmaku-anywhere/.env packages/danmaku-anywhere/.env.local; do
  if [ -f "$f" ]; then
    cp "$f" "../danmaku-anywhere-DA-XXX-<hint>/$f"
  fi
done
```

**Install dependencies** — `node_modules/` is not shared between worktrees, so type-check/lint/tests will fail until deps are installed. Build packages too so downstream type-checks can find `dist/`:

```bash
cd ../danmaku-anywhere-DA-XXX-<hint> && pnpm install && pnpm build:packages
```

**Register worktree for permissions** — add the worktree root path to `additionalDirectories` in the user's Claude Code settings (use the `update-config` skill) so the new session has file access without re-prompting.

### 2b. Worktree Handoff

**If a worktree was created**, hand off to a new Claude session running in it:

1. Write `.claude-task.md` in the worktree root with the task context:

```markdown
# Task: <task description>
- **ClickUp ID**: DA-XXX
- **Type**: <extension|app|proxy|chore|docs>
- **Branch**: DA-XXX_<hint>

## Instructions
Execute the da-dev workflow starting from step 3 (Implement).
Read `.claude/commands/da-dev.md` for the full workflow.
Steps 1–2 are already complete.
```

2. Open Claude in a new tab:

```bash
wt -w 0 new-tab --title 'DA-XXX: <short description>' -d '<worktree-path>' -- powershell -NoExit -Command "claude --permission-mode acceptEdits 'Read .claude-task.md and follow the instructions'"
```

3. **Stop here.** The current session is done. The new Claude session handles steps 3–8.

**If no worktree** (trivial change on a local branch), continue with steps 3–8 below.

### 3. Implement

Make the changes. Follow CLAUDE.md conventions.

### 4. Verify

`pnpm lint` already runs `tsc`, so it covers type-check + biome. For tests, default to changed-package scope:

| Area          | Verify command                                     | Manual verification                               |
| ------------- | -------------------------------------------------- | ------------------------------------------------- |
| Extension     | See `packages/danmaku-anywhere/AGENTS.md`          | **Open dev browser** at start of work (see below) |
| Web app       | See `app/web/AGENTS.md`                            | **CF preview URL** from PR deploy comment         |
| Backend       | See `backend/proxy/AGENTS.md`                      | N/A                                               |
| Packages      | `pnpm --filter <package> test`                     | N/A                                               |
| Cross-cutting | `pnpm lint && pnpm --filter '...[origin/master]' test` | Depends on areas touched                          |

Run e2e (`pnpm --filter @mr-quin/danmaku-anywhere test:e2e`) only when changes touch content scripts, mount profiles, integration policies, dango manifests, or popup flows covered by an existing spec — it's slow and opt-in.

#### Extension: open dev browser

For extension changes, launch a dev browser with HMR **at the start of implementation**. Always run `pnpm install` first — fresh worktrees have no `node_modules`, and stale worktrees may be out of date with the lockfile:

```bash
wt -w 0 new-tab --title 'DA-XXX: dev browser' -d '<worktree-path>/packages/danmaku-anywhere' -- powershell -NoExit -Command "pnpm install; pnpm dev:browser"
```

`dev:browser` launches Chromium with developer mode enabled and the extension pre-pinned to the toolbar. The bottom-left of the popup and the floating panel both carry a coloured `DEV`/`PREVIEW` chip and a branch-name chip — handy for telling worktrees apart at a glance.

Human verifies behavior live. Skip for trivial changes (config-only, types, docs).

#### Extension: agentic verification

For substantive UI / runtime changes, also self-verify via the `browser-verify` skill before alerting the human — drives a separate MCP-controlled Chrome to install the build, navigate, screenshot, and inspect. Workflow:

```
Skill(browser-verify)
```

Skip when the change is non-visual (types, docs, config, internal refactors).

#### Extension: i18n extraction

When adding or modifying i18n keys (`t('...')` calls), run extraction **before committing**:

```bash
cd <worktree-path>/packages/danmaku-anywhere && pnpm i18n extract
```

This regenerates the JSON translation files (sorts keys, removes unused entries). Then translate any new entries in the `zh` locale. CI runs `i18n:check` and will fail if the committed JSON doesn't match what extraction produces.

#### Web app: Cloudflare preview

After the PR is created, Cloudflare posts a preview URL. Include it when alerting the human.

### 5. Commit and Self-Review

```bash
git add <specific files>
git commit -m "<descriptive message>"
```

Before pushing, run reviews using **clean subagents** (no prior context):

- Always run `/review`
- Run `/security-review` when the change touches user input, auth, APIs, or data storage

Fix any issues found, then add a commit. Never include Co-Authored-By or AI attribution.

### 6. Push and Create PR

The PR itself is the human gate — push and open it without waiting.

```bash
git push -u origin DA-XXX_<hint>
gh pr create --title "(type) description [DA-XXX]" --label "ai-rereview" --body "$(cat <<'EOF'
## Summary
- <bullet points>
EOF
)"
```

- **type** must be one of: `extension`, `app`, `proxy`, `chore`, `docs` (lowercase, CI validates)
- **type must match** the ClickUp task's Type field
- **DA-XXX must match** the branch name
- Do NOT include ClickUp links in the PR body — they are posted automatically
- The `ai-rereview` label is required: `.github/workflows/ai-rereview.yml` watches it and re-requests AI reviewers on every push

### 7. Review Monitoring

```
/loop 5m check PR #N for review comments, report status, address comments, push fixes
```

**Each iteration reports status:**

```bash
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N/reviews --jq '[.[] | {author: .user.login, state: .state}]'
gh api repos/Mr-Quin/danmaku-anywhere/issues/N/reactions --jq '[.[] | {user: .user.login, reaction: .content}]'
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N --jq '{requested_reviewers: [.requested_reviewers[]? | .login]}'
gh api repos/Mr-Quin/danmaku-anywhere/pulls/N/comments
gh pr checks N
```

**When review comments are found:**

1. **Evaluate validity** — not all bot suggestions are correct
2. **If valid**: fix, reply with what changed
3. **If not valid**: reply with why it was declined
4. **Resolve the thread**:

```bash
gh api graphql -f query='{ repository(owner: "Mr-Quin", name: "danmaku-anywhere") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved } } } } }'
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

**Stop the loop when ALL are true:**

1. All review threads handled (addressed/declined/resolved)
2. No pending reviews (no unmatched eyes reactions, no pending reviewer requests)
3. All CI checks completed — if any **fail**, fix before stopping

**Keep looping when:** bots still processing (eyes emoji without review), reviewers pending, or CI running.

On stop: alert human. **NEVER merge PRs** — merging is always a human action.

### 8. Worktree Cleanup

After the PR is merged, run `/da-cleanup` to remove completed worktrees. This also cleans up stale `additionalDirectories` and `Read(...)` allow rules from `~/.claude/settings.json`.

## Recovery

- **Lint / type-check fails mid-way:** fix and commit on top. Don't amend.
- **i18n keys touched but extraction not run:** `cd packages/danmaku-anywhere && pnpm i18n extract`, then stage the regenerated JSON.
- **New Claude tab closed:** the worktree is still valid. `cd <worktree> && claude --add-dir .` to resume; `.claude-task.md` carries state.
- **CI flake (unrelated failure):** retry the workflow once via `gh run rerun <id>`. If it fails again, comment on the PR and stop the loop.
