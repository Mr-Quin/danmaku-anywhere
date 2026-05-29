---
name: reviewing-ai-feedback
description: Use when evaluating review comments from AI reviewers (gemini-code-assist, copilot-pull-request-reviewer) on a PR. Default to assuming the reviewer is right; verify before declining. Includes reporting in chat and resolving threads after handling.
---

# reviewing-ai-feedback

## Default stance

AI reviewers catch real issues most of the time. Default to verifying the suggestion against the code, then accepting it. **Decline only when you can name the specific rule** (CLAUDE.md / AGENTS.md / skill convention) that makes the suggestion wrong here, and quote that rule in the reply.

If you're building an argument for why the reviewer is wrong, stop and re-read the comment. The cost of accepting an unnecessary nit is small; the cost of dismissing a real problem is large.

## Per-thread flow

1. Read the comment in full.
2. Verify against the current code. Does the cited line exist? Is the suggested fix correct against the live API?
3. If valid, push a fix commit and reply with the SHA.
4. If declining, cite the rule in the reply.
5. Resolve the thread (`babysit-pr` covers the GraphQL mechanics). Resolve applies to both accepted and declined.

## Reporting in chat

When you've worked a batch of threads, emit a structured summary to chat so the human can scan it without paging through the PR:

```
Reviewed N threads:
- accepted: <count>  (commits: <sha-list>)
- declined: <count>  (rules cited: <short list>)
- moot:     <count>  (lines/sections removed in earlier commits)
- handed off: <count>  (links + reason)
```

Add one-line summaries for each batch worth calling out ("hardcoded IDs → placeholders"; "em dashes → hyphens per CLAUDE.md"). Anything handed off needs a one-line reason.

## Known false-positive patterns

Narrow cases where declining is justified. Match exactly; don't generalize.

1. **Defensive add-back.** A rule was actively removed in this PR; reviewer wants it kept "just in case." Re-adding re-encodes the old policy. Decline by naming the rule that removed it.
2. **Magic-number extraction where the number IS the docs.** Single-use value with surrounding prose that explains it. Extracting severs the explanation.
3. **Suggested change violates a project convention.** CLAUDE.md / AGENTS.md / a skill says X; reviewer suggests not-X. Decline citing the file and line.
4. **"Add tests for X" where coverage exists in a sibling file.** Reviewer didn't see it in the diff. Decline citing the existing test by path:line.
5. **Plausible-but-derived threshold.** Reviewer is doing arithmetic on a number you wrote. If your number was an approximation, reword the original to be empirical rather than tightening it.

## Always-accept signals

- Concrete diff against a real line, that compiles
- Logic error (off-by-one, missing clamp, dead branch, wrong scale math)
- **Hardcoded host path, OS-specific command, or project-specific magic value in a committed agent doc** (per da-dev step 3 portability rule)
- **Security risk:** raw token in shell, suggestion to bypass a tool boundary, leaked credential
- Convention violation you actually introduced (new em dashes, etc.)
- Contradiction between PR description and the diff. Either fix the diff or `gh pr edit` the body
- Accessibility issue with concrete repro

## Reply style

Accept: `Fixed in <sha> by <thing>.` Decline: cite the rule, e.g. `Conflicts with CLAUDE.md <rule>` or `Single-use value; surrounding prose is the docs.` Don't argue; don't relitigate. If the reviewer re-flags the same thing on a later push, back-reference the prior thread and resolve.
