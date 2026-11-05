# agent-skills

A personal marketplace of 14 [Claude Code](https://claude.com/claude-code) skills. Individual skills are also available through the [skills CLI](https://github.com/vercel-labs/skills).

## Skills

The examples below use standalone Claude Code commands. If you installed the plugin, add the `agent-skills:` prefix, for example `/agent-skills:explain-simply README.md`. See [Claude Code’s plugin command format](https://code.claude.com/docs/en/plugins).

### Understanding

- **[explain-diff](skills/explain-diff/SKILL.md)** — Makes one interactive HTML page that explains a code change. (Takes reference from [Geoffrey Litt's PR explanation prompt](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524).)
  - Input: the current diff, a branch, a pull request, or files that you name. With no input, it explains the current checkout.
  - Output: one page with background, intuition, a code walkthrough, diagrams, and a five-question quiz.
  - The page has no external dependencies. It is saved as a dated file outside the repository, so it stays out of version control.
  ```bash
  /explain-diff main..feature/retry-queue
  ```
- **[explain-simply](skills/explain-simply/SKILL.md)** — Explains a subject in plain, controlled English, written about 80% of the way to [ASD-STE100](https://www.asd-ste100.org/) (Simplified Technical English). (Idea from [Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479).)
  - Subject: a file, a directory, a URL, or a topic.
  - With no subject, it explains the current conversation.
  ```bash
  /explain-simply README.md
  ```
- **[max-words](skills/max-words/SKILL.md)** — Sets a maximum word count for the response when Claude explains a technical, computer science, or software concept.
  - Input: one number, the maximum word count.
  - The limit stays in effect for the rest of the session.
  ```bash
  /max-words 50
  ```

### Planning

- **[grilling](skills/grilling/SKILL.md)** — Interviews you about a plan or design to find its weak points before you build.
  - Asks one question at a time.
  - Continues until the plan has no open questions.
  - Claude starts this skill on its own when you use a "grill" phrase, for example "grill me on this design".
- **[grill-me](skills/grill-me/SKILL.md)** — Shortcut that starts a `/grilling` session.
  ```bash
  /grill-me
  ```

### Spec Creation

- **[specs](skills/specs/SKILL.md)** — Turns a product idea, and the decisions from a `/grill-me` session, into the foundation specs for a project. It writes three files in a `specs/` directory:
  - `specs/mission.md`: the problem, the users, and the functional requirements.
  - `specs/tech-stack.md`: the non-functional requirements, the stack, the system design, and the decisions.
  - `specs/roadmap.md`: the delivery phases. Each phase maps to requirement IDs.
  - Input: a product description, or a path to notes, a PRD, or an existing design doc. With no input, it uses the current conversation.
  ```bash
  /specs notes/grill-me-decisions.md
  ```

### Spike

- **[rea-spike](skills/rea-spike/SKILL.md)** — Reverse engineers a product or website with REA (Reverse Engineer Anything), then builds a fully open source reimplementation of it. (Uses [REA](https://rea.tools/) by [morluto](https://github.com/morluto/rea), MIT licensed. Run `npx rea-agents@latest setup` first.)
  - Input: the target and the programming language. The target can be a URL, a product name, or a local path to an app or package.
  - Step 1 - scope: asks about your relationship to the target, then selects a mode.
    - **Parity mode**: rebuilds the whole product. Used when you own the target, the owner authorized you, or the target is permissively licensed open source.
    - **Demo mode**: builds a bounded, clearly labeled educational demo of the primary workflow plus a few representative features. Used when you only study the target.
  - Step 2 - reverse engineer: writes a feature checklist with evidence, the recovered API contracts, the data model, and a performance baseline.
  - Step 3 - build: scaffolds the reimplementation on the latest stable release of your language, with a first vertical slice, tests, lint, CI, and a benchmark.
  - Registers a Stop hook, the same mechanism that `/goal` uses. The hook keeps Claude Code building until every feature is done and the performance targets are met, so the whole spike runs from one command.
  - Requests Claude Opus with `xhigh` effort through Claude Code frontmatter.
  ```bash
  /rea-spike https://todomvc.com/examples/react/ Rust
  ```

### Coding

- **[execute-with-pre-and-post](skills/execute-with-pre-and-post/SKILL.md)** — Runs an approved plan-mode plan one phase at a time.
  - Before each phase: a short pre-brief.
  - After each phase: a PM-style commit message, the changed files, the progress, and a preview of the next phase.
  - Pauses for your go-ahead between phases.
  - Always writes each phase with the `clean-code` skill, and reviews the phase's files with it before the report.
  - Always writes the commit message, and the final wrap-up summary, with the `pm-commit` skill.
  - Input: a path to the plan file. With no input, it uses the plan most recently approved in the session, or the newest file in `~/.claude/plans/`.
  ```bash
  /execute-with-pre-and-post plans/2026-11-05-add-webhook-retries.md
  ```
- **[clean-code](skills/clean-code/SKILL.md)** — Writes and refactors clean code: DRY, SOLID, obvious human-readable names, and no single-character variables, not even in loops.
  - With no input: applies the rules to all code that Claude writes or changes in the session. Claude also applies this skill on its own when it codes.
  - With a file, directory, or diff: reviews that code, lists each violation with its file and line, then fixes the violations. Asks before a refactor that changes a public interface or touches many files.
  ```bash
  /clean-code src/billing/
  ```
- **[pm-commit](skills/pm-commit/SKILL.md)** — Writes a git commit message from a product manager's point of view.
  - Says what changed and why it matters to users, with enough technical detail to be specific.
  - One paragraph, at most 50 words.
  - Input: a commit, a branch, a range, or a description of the change. With no input, it reads the staged changes. If nothing is staged, it reads the working tree.
  - Prints the message. It does not commit.
  ```bash
  /pm-commit
  ```

### Documentation

- **[system-design](skills/system-design/SKILL.md)** — Makes a self-contained HTML system design document with Excalidraw-style diagrams.
  - Sections: functional and non-functional requirements, core and secondary entities, API design, data flow, service and database architecture, CI/CD, deep dive suggestions, and security considerations.
  - Input: a product description, a path to specs or notes, or a repository. With no input, it uses the current project.
  - For an existing system, it marks what is implemented and what is proposed.
  - Requests Claude Opus with `xhigh` effort through Claude Code frontmatter for best results.
  ```bash
  /system-design specs/
  ```
- **[sync-docs](skills/sync-docs/SKILL.md)** — Compares the changes merged to `main` over a period against your docs, then updates the docs that are missing or stale and opens a pull request. Built to run weekly with `/schedule`.
  - Docs location (first argument): a `docs/` folder, a README, a local checkout of a docs repo, or a GitHub `owner/repo`. With no location, it detects one.
  - `--since`: a git ref, an ISO date, or `Nd` for N days. Default: the merge time of the last sync PR, or the past week if there is none.
  - `--dry-run`: writes the report only. It does not branch, commit, push, or open a PR.
  ```bash
  /sync-docs docs/ --since 14d --dry-run
  ```

### Productivity

- **[teach](skills/teach/SKILL.md)** — Turns the current directory into a persistent learning workspace. (From [mattpocock/skills](https://github.com/mattpocock/skills).)
  - Files: a mission, a resource list, HTML lessons, reference sheets, and learning records.
  - The workspace carries across sessions, so each session continues from the last one.
  - Input: what you want to learn. With no input, it continues the current workspace.
  ```bash
  /teach Rust ownership and borrowing
  ```
- **[handoff](skills/handoff/SKILL.md)** — Compacts the current conversation into a handoff document that a fresh agent session can pick up. (From [mattpocock/skills](https://github.com/mattpocock/skills).)
  - Saves the document in the OS temporary directory.
  - References existing artifacts instead of copying them.
  - Input: the focus of the next session. With no input, it writes a general handoff.
  ```bash
  /handoff Fix the flaky integration tests in the payments module
  ```

## Install

### Claude Code (plugin)

From inside Claude Code on any machine, add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add jerome-chua/agent-skills
/plugin install agent-skills@jerome-agent-skills
```

To update the installed plugin later, run this in your shell:

```bash
claude plugin update agent-skills@jerome-agent-skills
```

Restart the session to load the updated version. Updating only the marketplace listing is a separate action; see [Claude Code’s update instructions](https://code.claude.com/docs/en/discover-plugins#update-plugins-now).

> `agent-skills` is the plugin name and `jerome-agent-skills` is the marketplace name (both defined in `.claude-plugin/`). The `jerome-chua/agent-skills` argument is the GitHub repo the marketplace is fetched from.

### Compatible agents (npx)

Every skill follows the open [Agent Skills](https://agentskills.io) spec, so it also works in any agent that supports the spec.[^1] Use the [skills CLI](https://github.com/vercel-labs/skills) (Node.js 22.20 or later) to install skills into a project. The CLI lets you choose the skills and target agents:

```
npx skills@latest add jerome-chua/agent-skills
```

Add `-g` to install across projects, or `--skill explain-simply` to select a single skill.

Check for and apply updates with the [skills CLI update commands](https://github.com/vercel-labs/skills#other-commands):

```bash
npx skills@latest check
npx skills@latest update
```

For a manual install, copy the entire skill directory, including any supporting files, into your agent’s skills directory. Agents that use `.agents/skills/` can load skills there per project, or from `~/.agents/skills/` per user; other agents may use different paths.

CLI-installed skills are managed separately from the Claude Code plugin; use the CLI commands above to update them. Manually copied skills need to be refreshed by hand.

[^1]: Including OpenCode, Gemini CLI, Cursor, Amp, Goose, GitHub Copilot / VS Code, and more — see the full [client showcase](https://agentskills.io/clients).

## Layout

```text
agent-skills/
├── .claude-plugin/
│   ├── marketplace.json     # marketplace: jerome-agent-skills
│   └── plugin.json          # plugin: agent-skills
├── skills/
│   ├── clean-code/
│   ├── execute-with-pre-and-post/
│   ├── explain-diff/
│   ├── explain-simply/
│   ├── grill-me/
│   ├── grilling/
│   ├── handoff/
│   ├── max-words/
│   ├── pm-commit/
│   ├── rea-spike/
│   ├── specs/
│   ├── sync-docs/
│   ├── system-design/
│   └── teach/
├── LICENSE
└── README.md
```

Each skill directory contains `SKILL.md`. Some also include supporting Markdown formats referenced by the skill.

## License

[MIT](LICENSE).
