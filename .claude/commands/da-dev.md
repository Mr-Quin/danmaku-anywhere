---
name: da-dev
description: Use when implementing features, fixing bugs, or making any code/config changes that need a PR — orchestrates the full dev workflow from ClickUp task to PR with review monitoring
---

# da-dev — Development Workflow

Task: $ARGUMENTS

Orchestrates: ClickUp task → branch → implement → verify → self-review → PR → review monitoring → human handoff.

## Step Details

### 1. ClickUp Task

This is the ClickUp-integrated workflow and is opt-in; contributors who don't use it never need ClickUp configured. The workspace IDs come from environment variables (inherited across worktrees): `CLICKUP_DA_LIST_ID` (Extension Tasks list), `CLICKUP_DA_SPACE_ID`, and `CLICKUP_DA_TYPE_FIELD_ID`. If any are unset, stop and ask the user to export them (e.g. in `~/.zshenv`). Resolve the Type *option* ID for the chosen type (extension/app/proxy/chore/docs) by name via `clickup_get_custom_fields`, so the option IDs need no separate config.

Explore for an existing match: `clickup_search` with nouns from the request, scoped to the Extension Tasks list. Scan recent activity if the search is too narrow. Multiple plausible hits → list and ask. None → create one and pick the Type based on the scope of the change. Grab the custom ID (`DA-XXX`).

### 2. Branch & worktree

Pick a `hint` — 2-4 kebab-case words describing the task (e.g. `dev-workflow`, `bilibili-cookie-fix`, `theme-redesign`). For features/fixes, run:

```bash
node scripts/da-bootstrap.mjs --task DA-XXX --hint <hint> --type <extension|app|proxy|chore|docs>
```

That handles `git fetch`, `git worktree add`, env copy, `pnpm install`, `pnpm build:packages`, and writes task notes to `~/.claude/da-tasks/DA-XXX.md` (outside the repo, survives `/da-cleanup`). It ends with a machine-readable `READY` block (`worktree=...`, `branch=...`, `task_file=...`, `title=...`). Parse those, then use the `worktree-tab` skill to open a fresh Claude session in the worktree. The new session reads `<task_file>` and starts from step 3. **Stop the current session here.**

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
- **Library / framework idioms**: use each library's blessed patterns rather than inventing your own. Before writing a helper, check whether the framework already exposes the primitive (e.g. React hook, Hono middleware, Playwright fixture, octokit method, MUI component). For unfamiliar APIs or recent versions, fetch current docs via the `context7` MCP instead of trusting model memory. Match the project's existing usage of a library; if everywhere else uses pattern A and you're tempted to introduce pattern B, the burden of proof is on B.
- **e2e coverage**: every feature/fix lands with e2e coverage under `packages/danmaku-anywhere/e2e/` unless coverage is genuinely infeasible. State *why* in the PR body when skipping. Use `browser-verify` while authoring the spec.
- **Committed agent docs stay portable.** Files under `.claude/`, `CLAUDE.md`, `AGENTS.md` must not contain absolute paths into a developer's machine, OS-specific commands without an alternative, or project-specific magic values. Workspace-specific values (ClickUp IDs, browser executable paths, etc.) live in environment variables (e.g. `CLICKUP_DA_*`, `CHROME_DEVTOOLS_EXECUTABLE`) that the developer sets in their shell, not in committed files; env vars are inherited across worktrees, unlike per-project agent memory. If a workflow depends on an MCP or local tool that may not be present, declare the prerequisite so the agent can stop and tell the human on a miss.

### 4. Verify

`pnpm lint` already runs `tsc`, so it covers type-check + biome. For tests, default to changed-package scope:

| Area          | Verify command                                     | Manual verification                               |
| ------------- | -------------------------------------------------- | ------------------------------------------------- |
| Extension     | See `packages/danmaku-anywhere/AGENTS.md`          | **Open dev browser** at start of work (see below) |
| Web app       | See `app/web/AGENTS.md`                            | **CF preview URL** from PR deploy comment         |
| Backend       | See `backend/proxy/AGENTS.md`                      | N/A                                               |
| Packages      | `pnpm --filter <package> test`                     | N/A                                               |
| Cross-cutting | `pnpm lint && pnpm --filter '...[origin/master]' test` | Depends on areas touched                          |

Run e2e (`pnpm --filter @mr-quin/danmaku-anywhere test:e2e`) for any PR that adds or touches an e2e spec, or that changes content scripts, mount profiles, integration policies, dango manifests, or popup flows. The suite should be running before push.

#### Extension: open dev browser (for the human)

For extension changes, launch the human's dev browser with HMR at the start of implementation:

```bash
cd <worktree-path>/packages/danmaku-anywhere && pnpm dev:browser
```

Run it in a new terminal so the Vite server keeps streaming. It opens Chromium with developer mode on and the extension pre-pinned. In non-prod builds the popup and floating panel display the current env + branch so multi-worktree sessions are unambiguous.

Skip for trivial changes (config-only, types, docs).

#### Extension: agentic verification (for the agent)

For any change with runtime behavior worth observing (not just visual changes), self-verify via the `browser-verify` skill. Use it to confirm wiring (commands fire, RPC propagates, storage writes invalidate) and to capture selectors and event sequencing for the e2e spec. To exercise an already-published preview build instead (reproducing against build N, bisecting nightlies), use `preview-build`.

#### Web app: Cloudflare preview

After the PR is created, Cloudflare posts a preview URL. Include it when alerting the human.

### 5. Commit and Self-Review

```bash
git add <specific files>
git commit -m "<descriptive message>"
```

Before pushing, run reviews using **clean subagents** (no prior context). They have no sunk-cost bias toward the lines you just wrote, which matters most for the KISS pass:

- Always run `/review`
- Always run `/simplify` for a KISS / YAGNI pass, then re-read the diff yourself with the same lens. It catches obvious dead code but misses subtler bloat, so treat its silence as a starting point, not a clean bill.
- Always run a **comment sweep**: have a clean subagent read the diff and delete every comment that doesn't earn its place under CLAUDE.md's `## Comments` policy. A fresh subagent has no attachment to the lines you just wrote, which is exactly why the author is the wrong one to prune them.
- Run `/security-review` when the change touches user input, auth, APIs, or data storage
- When the change carries runtime behavior, data contracts, migrations, non-trivial logic, or new-or-changed tests, also do a manual pass on two axes the commands above don't cover (skip for config-only, docs-only, or types-only changes). Each axis must end in a named failure; "the structure looks fine" is not a finding.
  - **Architecture / pattern fit**: does the change sit at the right seam, consistent with how the codebase already solves this? Look for a new coupling that other code now silently depends on, an invariant the types don't enforce (so a future caller can break it unnoticed), or an abstraction that duplicates one already in the tree. Name the specific seam or invariant at risk.
  - **Test gaps & theatre**: for each new or changed test, mentally invert its guard or mutate the value under assertion; if the test would still pass, it protects nothing. Then find the behavior this PR changed that no test would catch if it regressed. Name the test that would survive its own breakage, or the behavior left unasserted.

Fix any issues found, then add a commit. Never include Co-Authored-By or AI attribution.

### 6. Push and Create PR

The PR itself is the human gate — push and open it without waiting.

```bash
git push -u origin DA-XXX_<hint>
gh pr create --title "(type) description [DA-XXX]" --label "ai-rereview" --body "$(cat <<'EOF'
## Summary
- <one short bullet per major change; "what" + "why" if non-obvious>

## Test plan
- [ ] <commands or e2e spec(s) the reviewer should run; reference paths under `packages/danmaku-anywhere/e2e/specs/...`>
- <if e2e coverage is infeasible for this change, state why here>

## Notes
- <known edge cases, perf implications, follow-ups, anything that helps the reviewer>
EOF
)"
```

- **type** must be one of: `extension`, `app`, `proxy`, `chore`, `docs` (lowercase, CI validates)
- **type must match** the ClickUp task's Type field
- **DA-XXX must match** the branch name
- Do NOT include ClickUp links in the PR body — they are posted automatically
- Do NOT mention other DA-XXX in the body / commits; ClickUp auto-link will silently reopen those tasks
- The `ai-rereview` label is required: `.github/workflows/ai-rereview.yml` watches it and re-requests AI reviewers on every push
- Drop sections that don't apply (e.g. no `Notes` if there's nothing real to say) rather than padding

**Keep the PR body in sync as the branch evolves.** Use `gh pr edit <N> --body ...` (same HEREDOC pattern as creation) whenever new commits change scope, add/remove behavior, or invalidate a claim in the original body. Stale bodies mislead reviewers.

### 7. Review Monitoring

Once the PR is open, hand monitoring to the `babysit-pr` skill:

```
babysit PR #N
```

It owns the loop: status polling (`scripts/pr-status.sh <N>`), per-thread evaluation via `reviewing-ai-feedback`, the GraphQL resolve mechanics, the duration budget, and the stop conditions. When it stops, it alerts the human. **NEVER merge PRs** — merging is always a human action.

### 8. Worktree Cleanup

After the PR is merged, run `/da-cleanup` to remove completed worktrees. This also cleans up stale `additionalDirectories` and `Read(...)` allow rules from `~/.claude/settings.json`.

## Recovery

- **Lint / type-check fails mid-way:** fix and commit on top. Don't amend.
- **i18n keys touched but extraction not run:** `cd packages/danmaku-anywhere && pnpm i18n extract`, then stage the regenerated JSON.
- **New Claude tab closed:** the worktree is still valid. `cd <worktree> && claude --add-dir . "Read ~/.claude/da-tasks/DA-XXX.md and continue"` to resume.
- **CI flake (unrelated failure):** retry the workflow once via `gh run rerun <id>`. If it fails again, comment on the PR and stop the loop.
