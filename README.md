# agent-skills

A personal marketplace of [Claude Code](https://claude.com/claude-code) skills.

## Skills

### Understanding

- **explain-diff** — Generate a rich, self-contained interactive HTML explanation of a code change, diff, branch, or PR: background, intuition, code walkthrough, diagrams, and a five-question quiz, saved as a dated file outside the repo.
- **max-words** — Cap Claude's response length at N words when explaining technical / CS / software concepts. Invoke with `/max-words 50`.

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
