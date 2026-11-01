---
name: sync-docs
description: Review every change merged to the main branch over a period (default, since the last docs sync or the past week) against a documentation source, find docs that are now missing or stale, update them, and open a pull request. Use when the user invokes /sync-docs, asks to update, sync, or catch up the docs after recent merges, asks which docs are out of date, or sets up a recurring (for example weekly) docs review with /schedule.
argument-hint: "[docs path or owner/repo] [--since <ref|date|Nd>] [--dry-run]"
---

# sync-docs

Keep the documentation in step with the code. Look at what merged to `main` since the last sync, decide which of those changes a reader of the docs needs to know about, update the docs to match, and open one pull request. The code is the source of truth; the docs are a derived artifact that drifts unless someone checks it regularly. This skill is that check.

## Inputs

Parse `$ARGUMENTS`:

- **Docs location** (first positional). One of:
  - a directory or file in this repo, such as `docs/`, `website/docs`, or `README.md`;
  - a local path to a checkout of a separate docs repository;
  - a GitHub `owner/repo` for a separate docs repository (clone it into a temporary directory outside this repo).
  If omitted, detect it. Look for `docs/`, `documentation/`, `website/`, `mkdocs.yml`, `docusaurus.config.*`, `book.toml`, or `_config.yml`, then fall back to `README.md`. State which location you chose and why.
- **`--since`**: a git ref, an ISO date, or `Nd` for N days. Default: the merge time of the most recent PR whose title starts with `docs: sync` (find it with `gh pr list --state merged --search "docs: sync in:title"`). If there is none, use 7 days. Picking up from the last sync means a scheduled run never skips or double-counts a change.
- **`--dry-run`**: produce the report only. Do not branch, commit, push, or open a PR.
- **Base branch**: `main`, unless `gh repo view --json defaultBranchRef` says otherwise.

## Workflow

### 1. Collect the merged changes

Prefer PRs over raw commits, because PR titles and bodies carry intent that commit messages often lack:

```
gh pr list --state merged --base main --search "merged:>=YYYY-MM-DD" --limit 200 \
  --json number,title,body,mergedAt,files,labels,author,url
```

If `gh` is unavailable or the repo does not use PRs, fall back to `git log --first-parent main --since=<date>` and `git show --stat` per commit. Exclude PRs produced by earlier runs of this skill.

### 2. Triage: which changes affect a reader?

Classify each change. Usually documentation-relevant:

- new, removed, or renamed CLI commands, flags, subcommands, or keyboard shortcuts;
- configuration files, settings keys, environment variables, and their defaults;
- public API surface: exported functions, endpoints, request and response shapes, events;
- changed behavior or changed defaults, even when the interface is unchanged;
- deprecations, breaking changes, and migration steps;
- install, setup, supported platforms, or minimum version requirements;
- new features, and error messages a user is likely to search for.

Usually not relevant: refactors with no behavior change, tests, CI, internal tooling, dependency bumps that do not change requirements, and typo fixes.

When a title is ambiguous, read the diff with `gh pr diff <number>` rather than guessing. Keep a working table of change, verdict, and the one-line reason; it becomes the PR body later.

### 3. Map each relevant change to the docs

Read the docs' structure first: the navigation or sidebar config, the index page, and the folder layout. Then, for each relevant change, grep the docs for the affected names (the command, flag, option, function, old default value). Each change lands in one of three buckets:

- **Stale page**: a page describes the old behavior. Edit it.
- **Missing coverage**: nothing mentions it. Add a section to the page where the nav suggests it belongs, or a new page if the topic is large enough to stand alone.
- **Deliberately undocumented**: internal or experimental. Note it and move on.

Also check code samples and examples that reference anything whose signature, name, or output changed.

### 4. Write the updates

- Match the existing voice, heading levels, admonition style, front matter, and formatting. Read a neighbouring page before writing.
- Describe the behavior as the code implements it now. When the PR body is thin, open the source files the PR touched and confirm names, defaults, and edge cases there.
- Make examples that would run against the new code. A stale example is worse than no example.
- Update the changelog, release notes, or version table if the docs keep one.
- Keep the diff focused. Do not rewrite unrelated prose, reflow paragraphs, or fix style elsewhere; small focused docs PRs get merged, large ones stall in review.
- Do not invent. If you cannot confirm a behavior from the code, leave the docs alone for that item and list it under "Needs a human" in the PR.

### 5. Verify

- Run the docs build if there is one (`mkdocs build --strict`, `npm run build` in the docs site, `mdbook build`, and so on) and fix anything it reports.
- Check that every internal link and anchor you added or changed resolves.
- Re-read your full docs diff once as a reader who has not seen the code change.

### 6. Open the pull request

- Branch from up-to-date `main` as `docs/sync-YYYY-MM-DD`. For a separate docs repository, do this inside that repository.
- Make one commit: `docs: sync with changes merged <start-date>..<end-date>`.
- Push the branch and run `gh pr create` with the body template below. When the docs live in a separate repository, link source PRs by full URL so they resolve across repos.
- If nothing needed updating, do not open an empty PR. Print the report instead, so a scheduled run still leaves a visible trace of what was reviewed.
- Never commit to `main` directly and never force-push. Do not push at all in `--dry-run`.

## PR body template

```
## Summary
Docs updated for changes merged to `main` between <start> and <end>
(<N> PRs reviewed, <K> affected the docs).

## Changes documented
| Source | Change | Docs updated |
|---|---|---|
| #123 | Added `--timeout` flag to `serve` | `docs/cli/serve.md` |

## Reviewed, no docs change needed
- #124 — internal refactor of the scheduler, no behavior change

## Needs a human
- #125 — changes retry semantics; could not confirm the new default from
  `src/retry.ts`. Left `docs/reliability.md` unchanged.
```

Keep every row traceable to a PR or commit so a reviewer can check your reading of the change against its source.

## Running on a schedule

This skill is built for a recurring cadence. In Claude Code, describe the cadence in plain words:

```
/schedule Once a week run /sync-docs docs/ and open a PR to update the docs.
```

For a separate docs repository, pass it as the first argument, for example `/sync-docs acme/product-docs`. Because each run starts from the previous sync PR, consecutive runs do not overlap.

When running unattended, do not stop to ask questions. Use the defaults above, make the best-supported edit, and route every uncertainty into the "Needs a human" section of the PR, where a reviewer will see it.
