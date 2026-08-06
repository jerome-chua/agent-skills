---
name: max-words
description: Cap the agent's response length at N words when explaining technical / computer science / software concepts. Use when the user invokes /max-words with a single number, e.g. "/max-words 50".
disable-model-invocation: true
argument-hint: [N]
---

# max-words

Limit responses to a word budget when explaining technical, computer science, or software concepts.

## Input

A single integer `N` (e.g. `/max-words 50`) — the max words per response. If missing or not a positive integer, ask for a valid number.

## Rules

- Treat `N` as a hard ceiling on every reply until the user sets a new limit or stops it.
- The limit covers prose explanations of technical/CS/software topics. Code inside code blocks is exempt.
- Drop preamble and restatement before substance. Don't pad — fewer than `N` is fine.
- If a correct explanation can't fit, give the essential point within budget and add a terse final line offering to expand. Never silently exceed `N`.
