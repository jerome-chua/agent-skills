# agent-skills

A personal marketplace of 14 [Claude Code](https://claude.com/claude-code) skills. Individual skills are also available through the [skills CLI](https://github.com/vercel-labs/skills).

## Skills

Examples below use standalone Claude Code commands. With the plugin installed, add the `agent-skills:` prefix: `/agent-skills:explain-simply README.md`. See [Claude Code’s plugin command format](https://code.claude.com/docs/en/plugins).

### Understanding

- **[explain-diff](skills/explain-diff/SKILL.md)** — Generate a rich, self-contained interactive HTML explanation of a code change, diff, branch, or PR: background, intuition, code walkthrough, diagrams, and a five-question quiz, saved as a dated file outside the repo. (Takes reference from [Geoffrey Litt's PR explanation prompt](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524).)
- **[explain-simply](skills/explain-simply/SKILL.md)** — Explain a file, directory, URL, topic, or the current conversation in plain, controlled English, written about 80% of the way to [ASD-STE100](https://www.asd-ste100.org/) (Simplified Technical English). Invoke with `/explain-simply [target]`. (Idea from [Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479).)
- **[max-words](skills/max-words/SKILL.md)** — Cap the agent's response length at N words when explaining technical / CS / software concepts. Invoke with `/max-words 50`.

### Planning

- **[grilling](skills/grilling/SKILL.md)** — Interview you relentlessly about a plan or design, one question at a time, to stress-test it before building.
- **[grill-me](skills/grill-me/SKILL.md)** — Shortcut that kicks off a `/grilling` session. Invoke with `/grill-me`.

### Spec Creation

- **[specs](skills/specs/SKILL.md)** — Turn a product idea and the decisions from a `/grill-me` session into the foundation specs: `specs/mission.md` (problem, users, functional requirements), `specs/tech-stack.md` (non-functional requirements, stack, system design, decisions), and `specs/roadmap.md` (phased delivery, each phase mapped to requirement IDs). Invoke with `/specs [product description or path to notes]`.

### Spike

- **[rea-spike](skills/rea-spike/SKILL.md)** — Reverse engineer a product or website with REA (Reverse Engineer Anything), write a feature checklist with evidence, recovered API contracts, data model, and performance baseline, then scaffold a fully open source reimplementation pinned to the latest stable release of your chosen language with a first vertical slice, tests, lint, CI, and a benchmark. Asks about your relationship to the target first: **parity mode** rebuilds the whole product when you own it, are authorized by its owner, or it is permissively licensed open source; **demo mode** builds a bounded, clearly labeled educational demo of the primary workflow plus a few representative features when you are only studying it. Registers a Stop hook (the same mechanism `/goal` uses) that keeps Claude Code building until every feature is done and the performance targets are met, so the whole spike runs from one command. Requests Claude Opus with `xhigh` effort through Claude Code frontmatter. Invoke with `/rea-spike <product or website> <programming language>`. (Uses [REA](https://rea.tools/) by [morluto](https://github.com/morluto/rea), MIT licensed; run `npx rea-agents@latest setup` first.)

### Coding

- **[execute-with-pre-and-post](skills/execute-with-pre-and-post/SKILL.md)** — Run an approved plan-mode plan one phase at a time: a short pre-brief before each phase, then a PM-style commit message, changed files, progress, and a next-phase preview, pausing for your go-ahead. Invoke with `/execute-with-pre-and-post [plan file]`.
- **[clean-code](skills/clean-code/SKILL.md)** — Write and refactor clean, DRY, SOLID code with obvious human-readable names and no single-character variables (even in loops). Applies automatically when coding; invoke with `/clean-code [path]` to review or refactor existing code.
- **[pm-commit](skills/pm-commit/SKILL.md)** — Write a git commit message from a product manager's point of view: what changed and why it matters to users, with enough technical detail to be specific, in one paragraph of at most 50 words. Uses a supplied ref, range, or description; otherwise reads staged changes, falling back to the working tree when nothing is staged. Prints the message without committing. Invoke with `/pm-commit [ref, range, or description]`.

### Documentation

- **[system-design](skills/system-design/SKILL.md)** — Generate a self-contained HTML system design document with Excalidraw-style diagrams: functional and non-functional requirements, core and secondary entities, API design, data flow, service and database architecture, CI/CD, deep dive suggestions, and security considerations. Requests Claude Opus with `xhigh` effort through Claude Code frontmatter for best results. Invoke with `/system-design [product description, specs path, or repository]`.
- **[sync-docs](skills/sync-docs/SKILL.md)** — Review the changes merged to `main` over a period (default: since the last sync, or the past week) against your docs — a `docs/` folder, a README, or a separate docs repo — then update what is missing or stale and open a PR. Built to run weekly via `/schedule`. Invoke with `/sync-docs [docs path or owner/repo] [--since <ref|date|Nd>] [--dry-run]`.

### Productivity

- **[teach](skills/teach/SKILL.md)** — Turn the current directory into a persistent learning workspace: mission, resources, HTML lessons, and learning records that carry across sessions. Invoke with `/teach`. (From [mattpocock/skills](https://github.com/mattpocock/skills).)
- **[handoff](skills/handoff/SKILL.md)** — Compact the current conversation into a handoff document a fresh agent session can pick up. Saves it in the OS temporary directory and references existing artifacts. Invoke with `/handoff [next-session focus]`. (From [mattpocock/skills](https://github.com/mattpocock/skills).)

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
│   ├── specs/               # includes spec format templates
│   ├── sync-docs/
│   ├── system-design/
│   └── teach/               # includes learning workspace formats
├── LICENSE
└── README.md
```

Each skill directory contains `SKILL.md`. Some also include supporting Markdown formats referenced by the skill.

## License

[MIT](LICENSE).
