# agent-skills

A personal marketplace of [Claude Code](https://claude.com/claude-code) skills.

## Skills

- **max-words** — Cap Claude's response length at N words when explaining technical / CS / software concepts. Invoke with `/max-words 50`.

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
