---
name: rea-spike
description: Reverse engineer a product or website with REA (Reverse Engineer Anything), then build a fully open source reimplementation in the latest stable version of a chosen programming language, with performance as a first-class requirement. Asks about the user's relationship to the target first and runs in one of two modes, a feature-parity spike for targets the user owns or is authorized to rebuild, or a bounded educational demo for targets they are only studying. Registers a Stop hook, the same mechanism /goal uses, so one command runs the spike to completion. Use when the user invokes /rea-spike <product or website> <programming language>.
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
            every feature in the scope recorded in spike/SCOPE.md is built. Read
            the transcript so far.
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

Reverse engineer the supplied product or website with REA, write down what it does as a feature checklist with evidence, scaffold an open source reimplementation in the latest stable release of the supplied language, and keep building until the agreed scope and performance targets are met. The skill runs in one of two modes, chosen in Phase 0 from the user's relationship to the target: **parity mode** rebuilds the whole product for a target the user owns or is authorized to rebuild, and **demo mode** builds a bounded, working educational demo for a target the user is only studying. The Stop hook in the frontmatter re-prompts Claude after every turn until the completion condition holds, so the whole spike runs from one command.

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
- **Honest scope.** Record only the relationship and purpose the user actually stated in Phase 0. Never assert ownership, authorization, or an educational purpose the user did not give, and never run parity mode without an answer that supports it.
- **Open source.** Add a permissive license (MIT unless the user names another), a README that credits REA with the links above, and a contributing note. Use only dependencies whose licenses are compatible with the chosen license.
- **Fast by measurement.** Write explicit performance targets and verify them with a reproducible benchmark. Prefer the language's idiomatic high-performance choices: compiled or ahead-of-time builds where available, streaming over buffering, connection and resource pooling, no unnecessary allocations on hot paths.
- **Match complexity to the target.** A single process with an embedded or local database is a valid starting point. Add services, queues, or caches only when a parity feature or a measured target requires them.

## Phase 0: Scope and authorization

Before any REA investigation, establish what the user may do with the target and what the build is for. Skip the question only when the target is a local path or package the user clearly owns.

1. **Ask once.** Ask one question with two parts: what is the user's relationship to the target, and what is the reimplementation for? Typical answers: it is their own product; they are under an engagement with the owner, such as a pentest, migration, or consulting contract; it is open source under a license that permits reimplementation; or they have no relationship and want to learn how it works.
2. **Choose the mode.**
   - **Parity mode** when the user owns the target, is authorized by its owner, or the target is open source under a permissive license. The goal is a full feature-parity rebuild.
   - **Demo mode** for every other answer, including "I want to learn how it works" and "I want to build something like it". The goal is a working educational demo: the target's primary workflow end to end, plus a bounded set of representative features, built from recovered behavior with the user's own naming, interface, and copy. Feature parity with the target is explicitly not the goal, and the demo must not be positioned as a replacement for or affiliated with the target.
   - If the user has no relationship with the target and still asks for a full parity rebuild of a commercial product, say in one line that this skill does not do that and offer demo mode instead.
3. **Bound the demo.** In demo mode, propose a scope of the primary workflow plus three to five features that best teach how the product works, in one short list, and let the user adjust it. The user may ask for more, but keep the total to what one spike can finish.
4. **Record it.** Write `spike/SCOPE.md` with: the mode, the user's stated relationship and purpose in their own words, the chosen feature list, and a one-line disclaimer for the README. In demo mode the disclaimer reads along the lines of "An independent educational reimplementation built by studying the public behavior of <target>. Not affiliated with, endorsed by, or a substitute for <target>."

## Phase 1: Reverse engineer with REA

Produce `spike/` inside the new project directory (default `./<slug>/` under the current working directory, where `<slug>` is a short name derived from the target that is not the target's trademark; use the user's path if supplied).

1. **Inventory features.** Drive the target with REA browser or application tools. In parity mode, walk every navigable screen, menu, form, keyboard shortcut, and setting a signed-out and, where the user supplies credentials, a signed-in user can reach. In demo mode, cover the primary workflow and the features listed in `spike/SCOPE.md` in full, and survey the rest only enough to explain how the product fits together. For native or packaged targets, use REA's static analysis routes. Record each feature as `F-n` in `spike/PARITY.md` with: user-visible behavior, entry point, inputs, outputs, edge cases observed, and REA Evidence IDs. In demo mode, mark each row `in-scope` or `reference-only`.
2. **Recover contracts.** Capture network traffic, routes, request and response shapes, status codes, pagination, auth flows, and realtime channels. Write them to `spike/CONTRACTS.md`. Mark anything inferred rather than observed.
3. **Recover data model.** Derive entities, fields, identifiers, and relationships from payloads and client state. Write `spike/DATA-MODEL.md`.
4. **Measure the original.** Record the target's observed latency and payload sizes for its main flows so the reimplementation has a baseline to beat. Write `spike/BENCH.md` with targets expressed as percentiles and a repeatable method. In demo mode, measure only the in-scope flows.
5. **Mark boundaries.** List features that cannot be reached, are out of scope, or depend on third parties you will stub. List residual unknowns from REA's finding ledger. End the REA investigation with `reset_investigation`, saving the bundle to `spike/rea-bundle/` when the tool supports `save_path`.
6. **Explain it (demo mode).** Write `spike/HOW-IT-WORKS.md`: a short, evidence-linked walkthrough of how the product's primary workflow is put together, from interface to request to data, so the demo teaches the design rather than only reproducing it.

## Phase 2: Scaffold the reimplementation

1. Initialize the project with the pinned latest stable language version, its standard formatter, linter, and test runner, and a CI workflow that runs build, tests, lint, and the benchmark.
2. Create `ARCHITECTURE.md` from the recovered data model and contracts: modules, storage, public API, and the performance budget per flow. Put the disclaimer from `spike/SCOPE.md` near the top of the README, and in demo mode state the chosen scope there too.
3. Implement one end-to-end vertical slice covering the target's primary workflow, with a passing test, so the goal loop starts from a working build.
4. Add a `spike/PROGRESS.md` table with one row per in-scope `F-n` (every row in parity mode, only `in-scope` rows in demo mode): status (`todo`, `done`), test name, and benchmark result where relevant.
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

Report: the mode and the stated relationship from `spike/SCOPE.md`, the resolved target and pinned language version, the project path, counts of features inventoried and implemented, the baseline numbers and targets from `spike/BENCH.md`, and anything declined or unreachable. Keep the REA credit and the disclaimer in the project README.
