# roadmap.md Format

`specs/roadmap.md` orders the work into phases and says how to tell each phase is done. It references requirements by ID; it does not restate them.

## Template

```md
# Roadmap: {Product}

## Phase 1: {Name that describes what a user can do after it}
- **Goal**: {One sentence}
- **Delivers**: FR-1, FR-2, NFR-3
- **Done when**: {Observable condition, ideally something a user or tester performs}
- **Depends on**: {Earlier phase, decision, or external event; "nothing" for the first phase}
- **Risks**: {What could make this phase slip, and the fallback}

## Phase 2: {…}
…

## Later
| Requirement | Why it waits |
|---|---|
| FR-9 | {…} |

## Open questions
- {Sequencing questions the interview did not settle}
```

## Rules

- **Each phase produces something visible.** The first phase should put the thinnest end-to-end slice in front of a user, even an internal one. Phases that deliver only infrastructure push risk to the end.
- **Every FR lands somewhere.** Each functional requirement appears in exactly one phase or in "Later". If one is missing, the roadmap is incomplete; if it appears twice, split the requirement.
- **"Done when" is checkable.** "Backend complete" cannot be checked; "a new user can sign up, upload a file, and see it listed" can.
- **Keep phases coarse.** Three to six phases is typical. Breaking a phase into tasks belongs in plan mode, not here.
- **No dates unless the user gives them.** Order and dependencies are the roadmap's job. Dates without a team and a start are fiction.
