---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Use when the user invokes /handoff, or when another skill, such as rea-spike at its context checkpoint, needs to pause long-running work so a fresh session can resume it.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace - unless the skill that invoked this one names a different path; then save it there.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly. If another skill invoked this one, its instructions decide the document's required sections and location.
