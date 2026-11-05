---
name: specs
description: Turn a product idea, and the decisions reached in a /grill-me interview, into the foundation specs for a project - mission.md (problem, users, functional requirements), tech-stack.md (non-functional requirements, stack, system design), and roadmap.md (phased delivery) - inside a specs/ directory. Use when the user invokes /specs, usually right after a grilling session.
disable-model-invocation: true
argument-hint: "[product description, or path to notes]"
---

# specs

Write the foundation a product is built on: what it is and for whom, what it must do, how it will be built, and in what order. The output is three markdown files in `specs/` that every later plan, task, and review can trace back to.

The best input is a finished `/grill-me` interview. That interview resolves decisions one at a time; this skill records them so they stop living only in the conversation.

## Files

Create or update these in the `specs/` directory. Each has a format file next to this skill; follow it.

| File | Answers | Format |
|---|---|---|
| `specs/mission.md` | Why does this exist, for whom, and what must it do? Holds the **functional requirements**. | [MISSION-FORMAT.md](./MISSION-FORMAT.md) |
| `specs/tech-stack.md` | How will it be built and what must it withstand? Holds the **non-functional requirements** and **system design**. | [TECH-STACK-FORMAT.md](./TECH-STACK-FORMAT.md) |
| `specs/roadmap.md` | In what order, and how do we know each step is done? | [ROADMAP-FORMAT.md](./ROADMAP-FORMAT.md) |

The files use shared IDs (`FR-n`, `NFR-n`, `D-n`) so a roadmap phase can say exactly which requirements it delivers and a design choice can say which requirement forced it. Keep the IDs stable once written; other documents will cite them.

## Workflow

### 1. Find the specs directory

Look for an existing `specs/` directory at the project root. If it is not there, create it. If the three files already exist, this is a revision: read them first, keep their IDs, and change only what the new decisions change. Say at the end which sections you changed.

### 2. Gather the source material

Use, in this order of trust:

1. **The grilling interview in this conversation.** Every question the user answered is a decision; the recommendation they accepted or rejected is its rationale. Walk back through the interview and list each decision before writing anything, so none is lost.
2. **`$ARGUMENTS`**: a product description, or a path to notes, a PRD, or an existing design doc.
3. **The codebase**, when one exists: README, package manifests, existing config, directory layout. These settle tech-stack questions without asking.

If none of these answer the questions the format files ask, run the interview now: follow the `grilling` skill, one question at a time with a recommended answer, and limit it to the gaps. Do not fill gaps with plausible defaults and present them as decisions. A spec that guesses is worse than one that says "open", because people build on it.

### 3. Write the three files

- Write `mission.md` first, then `tech-stack.md`, then `roadmap.md`. Each depends on the one before it: the stack serves the requirements, and the roadmap orders the requirements.
- Make every functional requirement testable. "Users can export a report as CSV" can be checked; "the app is easy to use" cannot, and belongs in success metrics or a non-functional requirement with a target.
- Give every non-functional requirement a number or an observable condition: a latency at a percentile, a data-loss bound, a supported browser list.
- For every stack and design choice, record the alternatives that were considered and why they lost. This is the part a future reader cannot reconstruct.
- After `tech-stack.md` names a runtime and its libraries, run the `stack-check` skill. It looks each version up in Context Hub and the package registries and writes a Version compatibility section, so the spec does not pin a runtime that its own libraries no longer support.
- Scope each roadmap phase to something a user, or at least a developer, can see working. Phases that deliver only internal scaffolding hide risk until the end.
- Keep prose short. Tables for requirements, decisions, and phases; sentences for the problem, the solution, and the rationale.

### 4. Check consistency, then report

Before finishing, verify:

- every `FR` appears in exactly one roadmap phase, or in "Later";
- every `NFR` is served by at least one stack or design choice, or is explicitly deferred;
- nothing in `tech-stack.md` contradicts a decision in `mission.md`;
- the open-questions lists hold every gap you could not resolve.

Then give a short summary: files written, the count of FRs, NFRs, decisions, and phases, and the open questions that still need an answer. Do not paste the files back into the conversation.

## Rules

- One product per `specs/` directory. A second product, or a large sub-system that deserves its own mission, is a separate directory.
- Decisions change. When the user changes their mind later, update the file and the decision's rationale, rather than appending a contradiction.
- Do not write code, tickets, or task lists here. The roadmap names phases and what they deliver; planning the work inside a phase belongs to plan mode or a later skill.
