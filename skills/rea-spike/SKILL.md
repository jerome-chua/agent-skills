---
name: rea-spike
description: Reverse engineer a product or website with REA (Reverse Engineer Anything), then build a fully open source, feature-parity reimplementation in the latest stable version of a chosen programming language, with performance as a first-class requirement. Registers a Stop hook, the same mechanism /goal uses, so one command runs the spike to completion. Use when the user invokes /rea-spike <product or website> <programming language>.
disable-model-invocation: true
argument-hint: "<product or website> <programming language>"
model: opus
effort: xhigh
hooks:
  Stop:
    - hooks:
        - type: prompt
          prompt: >
            Claude is running the rea-spike skill, which must keep working until
            the reimplementation reaches feature parity. Read the transcript so far.
            Respond {"ok": true} only if one of these holds: (a) the latest turn
            shows every F-n row in spike/PROGRESS.md marked done with a named
            passing test, the project's test, lint, and benchmark commands all
            exiting 0 with every target in spike/BENCH.md met, and a clean git
            status on the spike branch; (b) Claude has explicitly stopped to ask
            the user for something only they can supply, such as a missing
            argument, REA setup, credentials, or authorization; (c) Claude's
            latest progress report says the spike turn count has reached 40.
            Otherwise respond {"ok": false, "reason": "<the next concrete piece
            of work, naming the F-n rows or checks still failing>"}. Respond
            {"ok": false, "impossible": true, "reason": "<why>"} only if the
            condition can never be met. Hook input: $ARGUMENTS
---

# REA Spike

Reverse engineer the supplied product or website with REA, write down what it does as a parity checklist with evidence, scaffold an open source reimplementation in the latest stable release of the supplied language, and keep building until parity and performance targets are met. The Stop hook in the frontmatter re-prompts Claude after every turn until the completion condition holds, so the whole spike runs from one command.

Credits: REA (Reverse Engineer Anything) by morluto, MIT licensed. Website: https://rea.tools/. Source: https://github.com/morluto/rea.

## Model guidance

The frontmatter requests Claude Opus at `xhigh` effort for the skill's turn. If the host cannot apply those settings, continue with the available configuration. The Stop hook evaluates on the small fast model, like `/goal`, and keeps the skill's model and effort for the working turns.

## Arguments

`/rea-spike <product or website> <programming language>`

- The first argument is the target: a URL, a product name, a local path to an app or package, or an already-open browser page. If it is a product name with no URL or path, resolve it to the public website or installable artifact and confirm the choice in one line.
- The second argument is the implementation language. Determine its latest stable release at run time from the language's official site or release feed; do not rely on remembered version numbers. Pin that version in the project's toolchain file.
- If either argument is missing, ask one question for the missing value and stop.

## Rules

- **Use REA for every reverse-engineering claim.** REA ships as an MCP server plus the `reverse-engineer-anything` skill. Before starting, confirm REA tools are available, for example `list_browser_targets`, `capture_browser_scenario`, `analyze_javascript_application`, or `open_binary`. Follow the loaded `reverse-engineer-anything` skill for routing, evidence handling, and recovery. If REA is not connected, tell the user to run `npx rea-agents@latest setup` (or install the `rea` Claude Code plugin from `morluto/rea`), restart the session, and rerun this skill. Do not substitute plain page fetching or guesswork for REA evidence.
- **Clean room.** Recover observable behavior, interface contracts, data shapes, and flows. Do not copy the target's source code, minified bundles, assets, copy, branding, or trademarks into the new project, and do not reuse its name. Only investigate targets the user is authorized to inspect and respect the target's terms where they apply. Note anything you declined to inspect for this reason.
- **Open source.** Add a permissive license (MIT unless the user names another), a README that credits REA with the links above, and a contributing note. Use only dependencies whose licenses are compatible with the chosen license.
- **Fast by measurement.** Write explicit performance targets and verify them with a reproducible benchmark. Prefer the language's idiomatic high-performance choices: compiled or ahead-of-time builds where available, streaming over buffering, connection and resource pooling, no unnecessary allocations on hot paths.
- **Match complexity to the target.** A single process with an embedded or local database is a valid starting point. Add services, queues, or caches only when a parity feature or a measured target requires them.

## Phase 1: Reverse engineer with REA

Produce `spike/` inside the new project directory (default `./<slug>/` under the current working directory, where `<slug>` is a short name derived from the target that is not the target's trademark; use the user's path if supplied).

1. **Inventory features.** Drive the target with REA browser or application tools. Walk every navigable screen, menu, form, keyboard shortcut, and setting a signed-out and, where the user supplies credentials, a signed-in user can reach. For native or packaged targets, use REA's static analysis routes. Record each feature as `F-n` in `spike/PARITY.md` with: user-visible behavior, entry point, inputs, outputs, edge cases observed, and REA Evidence IDs.
2. **Recover contracts.** Capture network traffic, routes, request and response shapes, status codes, pagination, auth flows, and realtime channels. Write them to `spike/CONTRACTS.md`. Mark anything inferred rather than observed.
3. **Recover data model.** Derive entities, fields, identifiers, and relationships from payloads and client state. Write `spike/DATA-MODEL.md`.
4. **Measure the original.** Record the target's observed latency and payload sizes for its main flows so the reimplementation has a baseline to beat. Write `spike/BENCH.md` with targets expressed as percentiles and a repeatable method.
5. **Mark boundaries.** List features that cannot be reached, are out of scope, or depend on third parties you will stub. List residual unknowns from REA's finding ledger. End the REA investigation with `reset_investigation`, saving the bundle to `spike/rea-bundle/` when the tool supports `save_path`.

## Phase 2: Scaffold the reimplementation

1. Initialize the project with the pinned latest stable language version, its standard formatter, linter, and test runner, and a CI workflow that runs build, tests, lint, and the benchmark.
2. Create `ARCHITECTURE.md` from the recovered data model and contracts: modules, storage, public API, and the performance budget per flow.
3. Implement one end-to-end vertical slice covering the target's primary workflow, with a passing test, so the goal loop starts from a working build.
4. Add a `spike/PROGRESS.md` table with one row per `F-n`: status (`todo`, `done`), test name, and benchmark result where relevant.
5. Commit on a fresh branch with a short message. Do not push.

## Phase 3: Build to parity

The Stop hook keeps the session working after each turn, so do not wait for the user between features.

1. Work through `spike/PROGRESS.md` in priority order: the primary workflow first, then features by how often a user would hit them. For each `F-n`, implement, add a named test, run the test and lint commands, and flip the row to `done` with the test name.
2. Run the benchmark whenever a hot path changes and record results against `spike/BENCH.md`. Treat a missed target as a failing feature.
3. Commit after each feature or small group of features on the spike branch. Do not push.
4. End every turn with a short progress report the evaluator can read: the turn count since the skill was invoked, counts of `done` and `todo` rows, the latest exit codes for test, lint, and benchmark, and the next `F-n` to tackle. Stop voluntarily when the count reaches 40 and report what remains.
5. If `/hooks` does not list this skill's Stop hook, or hooks are disabled in this environment, fall back to printing an equivalent `/goal` line for the user to paste, substituting real commands:

```text
/goal Every F-n row in spike/PROGRESS.md is done with a named passing test, `<test command>` exits 0, `<lint command>` exits 0, `<bench command>` meets every target in spike/BENCH.md, and git status is clean on the spike branch; or stop after 40 turns and report what remains.
```

Do not run both the hook and `/goal` at once. Tell the user they can stop the loop at any time by disabling the hook under `/hooks` or starting a new conversation with `/clear`.

## Handoff summary

Report: the resolved target and pinned language version, the project path, counts of features inventoried and implemented, the baseline numbers and targets from `spike/BENCH.md`, and anything declined or unreachable. Keep the REA credit in the project README.
