# agent-skills

A personal marketplace of [Claude Code](https://claude.com/claude-code) skills.

## Skills

### Understanding

- **explain-diff** — Generate a rich, self-contained interactive HTML explanation of a code change, diff, branch, or PR: background, intuition, code walkthrough, diagrams, and a five-question quiz, saved as a dated file outside the repo. (Takes reference from [Geoffrey Litt's PR explanation prompt](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524).)
- **max-words** — Cap the agent's response length at N words when explaining technical / CS / software concepts. Invoke with `/max-words 50`.

### Planning

- **grilling** — Interview you relentlessly about a plan or design, one question at a time, to stress-test it before building.
- **grill-me** — Shortcut that kicks off a `/grilling` session. Invoke with `/grill-me`.

### Coding

_None yet._

### Documentation

_None yet._

### Testing

_None yet._

### Automation

_None yet._

### Productivity

- **teach** — Turn the current directory into a persistent learning workspace: mission, resources, HTML lessons, and learning records that carry across sessions. Invoke with `/teach`. (From [mattpocock/skills](https://github.com/mattpocock/skills).)
- **handoff** — Compact the current conversation into a handoff document a fresh agent session can pick up. Invoke with `/handoff`. (From [mattpocock/skills](https://github.com/mattpocock/skills).)

## Install

From inside Claude Code on any machine, add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add jerome-chua/agent-skills
/plugin install agent-skills@jerome-agent-skills
```

To update later (after pushing new skills):

```
/plugin marketplace update jerome-agent-skills
```

> `agent-skills` is the plugin name and `jerome-agent-skills` is the marketplace name (both defined in `.claude-plugin/`). The `jerome-chua/agent-skills` argument is the GitHub repo the marketplace is fetched from.

## Use with other agents

Every skill follows the open [Agent Skills](https://agentskills.io) spec (`skills/<name>/SKILL.md` with `name` + `description` frontmatter), so they work in any agent that supports it — OpenAI Codex, Cursor, VS Code, and others.

For Codex and similar agents, either use the [skills CLI](https://github.com/vercel-labs/skills) to copy skills into a project:

```
npx skills@latest add jerome-chua/agent-skills
```

or copy a skill directory manually into `.agents/skills/` (per-repo) or `~/.agents/skills/` (per-user).

Each skill also ships an `agents/openai.yaml` with Codex-specific metadata — display name, short description, and `allow_implicit_invocation: false` for skills that should only run when explicitly invoked (Codex doesn't read Claude's `disable-model-invocation` frontmatter). Claude Code ignores these files.

## Layout

```
agent-skills
├── .claude-plugin/
│   ├── marketplace.json     # catalog users add (name: my-skills-marketplace)
│   └── plugin.json          # plugin identity (name: my-skills)
└── skills/
    └── max-words/
        └── SKILL.md
```
