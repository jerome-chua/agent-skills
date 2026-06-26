# agent-skills

A personal marketplace of [Claude Code](https://claude.com/claude-code) skills.

## Skills

- **max-words** — Cap Claude's response length at N words when explaining technical / CS / software concepts. Invoke with `/max-words 50`.

## Install

Add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add <owner>/agent-skills
/plugin install my-skills@my-skills-marketplace
```

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
