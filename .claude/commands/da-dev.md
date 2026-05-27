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
- **Library / framework idioms**: use each library's blessed patterns rather than inventing your own. Before writing a helper, check whether the framework already exposes the primitive (e.g. React hook, Hono middleware, Playwright fixture, octokit method, MUI component). For unfamiliar APIs or recent versions, fetch current docs via the `context7` MCP instead of trusting model memory. Match the project's existing usage of a library; if everywhere else uses pattern A and you're tempted to introduce pattern B, the burden of proof is on B.
- **e2e coverage**: every feature/fix lands with e2e coverage under `packages/danmaku-anywhere/e2e/` unless coverage is genuinely infeasible. State *why* in the PR body when skipping. Use `browser-verify` while authoring the spec.
- **Committed agent docs stay portable.** Files under `.claude/`, `CLAUDE.md`, `AGENTS.md` must not contain absolute paths into a developer's machine, OS-specific commands without an alternative, or project-specific magic values. Workspace-specific values (ClickUp IDs, etc.) belong in agent memory (`reference_*`) or a gitignored templated config. If a workflow depends on an MCP or local tool that may not be present, declare the prerequisite so the agent can stop and tell the human on a miss.

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

While `dev:browser` is running, agentic self-verification goes through the `browser-verify` skill — it drives its own MCP-controlled Chrome that loads the same `dev/chrome/` build, so HMR feeds both browsers without the agent stealing the human's window:

```
Skill(browser-verify)
```

Use it whenever the change has runtime behavior worth observing, not just visual changes. For non-visual changes it's the primary way to confirm wiring (commands fire, RPC propagates, storage writes invalidate) and to capture selectors and event sequencing for the e2e spec. Screenshots go to `.tmp/` (gitignored); never commit them.

If you only need to exercise a published preview build (e.g. reproducing against build N, bisecting nightlies), use the `preview-build` skill instead.

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

```
/loop 5m check PR #N for review comments, report status, address comments, push fixes
```

**Each iteration reports status:**

```bash
scripts/pr-status.sh <N>
```

One GraphQL call returns reviews, pending reviewers, open threads, reactions, and check states.

**When review comments are found:** use the `reviewing-ai-feedback` skill to evaluate each thread (it lists known false-positive patterns from gemini/copilot on this repo and gives an accept/decline checklist). The default is to evaluate, not apply.

Mechanically:

1. **Evaluate validity** via the skill above. Most reviewer suggestions are correct; decline only when you can name the rule
2. **If valid**: fix, reply with what changed (cite the commit SHA)
3. **If not valid**: reply with rationale citing the rule you're upholding
4. **Resolve the thread**:

Resolve `<owner>/<repo>` from `gh repo view --json owner,name`. Then:

```bash
gh api graphql -f query='{ repository(owner: "<owner>", name: "<repo>") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved } } } } }'
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
