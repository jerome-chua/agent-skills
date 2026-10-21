---
name: execute-with-pre-and-post
description: Execute an approved, phased plan one phase at a time, with a short pre-brief before each phase and a structured post-phase report (PM-style commit message, changed files, progress, next phase) after it. Use when the user invokes /execute-with-pre-and-post after plan mode.
disable-model-invocation: true
argument-hint: [plan file path]
---

# execute-with-pre-and-post

Run an approved plan one phase at a time. Before each phase, give a short pre-brief. After each phase, give a fixed four-part report, then stop and wait for the user.

## Input

- If `$ARGUMENTS` has a path, read that plan file.
- If not, use the plan that was most recently approved in this conversation. If there is none, use the newest file in `~/.claude/plans/` and say which file you picked.
- Find the plan's phases (for example, "Phase 1", numbered sections, or numbered steps). Count them to get **M**, the total.
- If the plan has no clear phases, propose a split into small phases that you can review on their own. Confirm the split with the user before you start.

## Loop

Do these steps for each phase **N**, in order.

### 1. Pre-brief (max 50 words)

```
### Starting Phase N of M: <phase name>
<goal of the phase, and the files you expect to touch>
```

Note the current `git status` so you can find this phase's changes later.

### 2. Execute

Do only the work in this phase. Do not start work from later phases. If you find work that belongs to a later phase, note it for the report.

### 3. Post-phase report

Use exactly this format:

```
### Phase N of M complete: <phase name>

**Commit message**
<one paragraph, max 42 words>

**Files changed**
- `path/to/file` (created | modified | deleted): <a few words on what changed>

**Progress**
- ✅ Phase 1: <name>
- ✅ Phase N: <name> ← just finished: <one sentence about what was accomplished>
- ⬜ Phase N+1: <name>
- ⬜ Phase M: <name>

**Next phase** (max 50 words)
<what Phase N+1 will involve>
```

Section rules:

- **Commit message**: write it as a technical product manager would. Say what changed and why it matters to users or the product. Include enough technical detail (components, endpoints, behaviors) to be specific. Use one paragraph of 42 words or fewer. Do not use bullets or a separate subject line.
- **Files changed**: build the list from `git status` and `git diff --name-status`, compared with the state at the start of the phase. Do not build it from memory. Include untracked new files as `created`. If the directory is not a git repository, list the files you touched.
- **Progress**: list every phase. Mark finished phases ✅ and the rest ⬜. Put the "just finished" note on the phase you just did.
- **Next phase**: use 50 words or fewer. Mention any risks or open questions.

### 4. Pause

Always stop after the report and wait for the user's go-ahead, even in auto mode. The user can ask for changes to the current phase before moving on. If they do, make the changes and give an updated report.

## Rules

- Only print the commit message. Never run `git add` or `git commit` unless the user asks. If they ask, use the message from the report.
- Count the words in the commit message and the next-phase text before you send. Rewrite either one if it goes over its limit.
- If a phase fails or is only partly done (for example, tests fail), say so in the report. Mark it ⚠️ instead of ✅, and explain what is left in "Next phase".
- If the plan must change during execution, say so in the report and confirm the change with the user before you continue.
- After the last phase, replace "Next phase" with **Wrap-up**: one line that summarizes the whole plan and names any follow-ups.
