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

### 2. Branch & worktree

Pick a `hint` — 2-4 kebab-case words describing the task (e.g. `dev-workflow`, `bilibili-cookie-fix`, `theme-redesign`). For features/fixes, run:

```bash
node scripts/da-bootstrap.mjs --task DA-XXX --hint <hint> --type <extension|app|proxy|chore|docs>
```

That handles `git fetch`, `git worktree add`, env copy, `pnpm install`, `pnpm build:packages`, and writes task notes to `~/.claude/da-tasks/DA-XXX.md` (outside the repo, survives `/da-cleanup`). On success it prints a trailing `READY` block with `worktree=...`, `branch=...`, `task_file=...`, `title=...`. Parse those and launch a new Claude session in the worktree:

```bash
wt new-tab --title '<title>' -d '<worktree>' -- powershell -NoExit -Command "claude --permission-mode acceptEdits --add-dir . -- 'Read <task_file> and follow the instructions'"
```

(On non-Windows hosts, open a terminal in `<worktree>` and run the `claude ...` portion directly.) The new session reads `<task_file>` and starts from step 3. **Stop the current session here.**

For trivial changes (CLAUDE.md / docs / config-only): branch directly without a worktree:

```bash
git fetch origin master && git checkout -b DA-XXX_<hint> origin/master
```

Reuse an existing worktree if its previous work is done.

### 3. Implement

Make the changes. Apply these in order:

- **CLAUDE.md conventions**: formatting, comment policy, no em dashes, function declarations, no syntax soup. Non-negotiable.
- **KISS**: write the simplest thing that solves the *actual* task. No fallback chains for inputs that cannot happen (trust the caller, trust the type), no constants used in one place, no helpers used once, no abstractions for one call site. Three similar lines beat one clever generic. If you catch yourself writing `?? a ?? b ?? c`, stop and ask which of those branches can actually fire.
- **YAGNI**: don't add a config knob, parameter, or branch unless *this* PR needs it. "In case someone later wants to…" is the smell. Future flexibility is cheaper to add when it's actually needed than to remove when it isn't.
- **Best practices**: explicit over implicit, boring over clever, validate at boundaries not internal call sites, let the type system do work. Match the surrounding code's style and idioms instead of importing patterns from elsewhere.

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

#### Extension: open dev browser (for the human)

For extension changes, launch the human's dev browser with HMR at the start of implementation:

```bash
cd <worktree-path>/packages/danmaku-anywhere && pnpm dev:browser
```

Run it in a new terminal so the Vite server keeps streaming. It opens Chromium with developer mode on and the extension pre-pinned. In non-prod builds the popup and floating panel display the current env + branch so multi-worktree sessions are unambiguous.

Skip for trivial changes (config-only, types, docs).

#### Extension: agentic verification (for the agent)

While `dev:browser` is running, agentic self-verification goes through the `browser-verify` skill — it drives its own MCP-controlled Chrome that loads the same `dev/chrome/` build, so HMR feeds both browsers without the agent stealing the human's window:

```
Skill(browser-verify)
```

Use for substantive UI / runtime changes. Skip when the change is non-visual.

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

Before pushing, run reviews using **clean subagents** (no prior context). They have no sunk-cost bias toward the lines you just wrote, which matters most for the KISS pass:

- Always run `/review`
- Always run `/simplify` for a KISS / YAGNI pass, then re-read the diff yourself with the same lens. `/simplify` catches obvious dead code but routinely misses subtler bloat: fallback chains where only the first branch fires (`?? a ?? b`), constants/helpers used in one place, defensive guards for inputs the caller or type system already guarantees, conditional branches whose other side never executes, parameters that are always passed the same value. If you spot one, fix it even when `/simplify` was silent.
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
scripts/pr-status.sh <N>
```

One GraphQL call returns reviews, pending reviewers, open threads, reactions, and check states.

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
- **New Claude tab closed:** the worktree is still valid. `cd <worktree> && claude --add-dir . "Read ~/.claude/da-tasks/DA-XXX.md and continue"` to resume.
- **CI flake (unrelated failure):** retry the workflow once via `gh run rerun <id>`. If it fails again, comment on the PR and stop the loop.
