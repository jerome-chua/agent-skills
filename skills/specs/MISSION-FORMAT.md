# mission.md Format

`specs/mission.md` says why the product exists, for whom, and what it must do. It owns the functional requirements. Every other spec, plan, and roadmap phase should trace back to a line in this file.

## Template

```md
# Mission: {Product}

## Problem
{2-4 sentences. What is painful or impossible today, for whom, and what it costs them. Concrete: name the situation, not the abstraction.}

## Users
| User | Situation | What they need from this |
|---|---|---|
| {Primary user} | {When and where they meet the problem} | {The outcome they want} |

## Solution
{One paragraph. What the product is, in the user's terms. If it has a one-line pitch, put it first.}

## Functional requirements
| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| FR-1 | {Something the system does, stated so it can be verified} | must | {Which user or problem line it serves} |
| FR-2 | … | should | … |
| FR-3 | … | could | … |

## Success metrics
- {Observable outcome with a number and a time: "80% of imports complete without manual fixes by month 3"}

## Out of scope
- {Things explicitly not being built now, and why. Protects the roadmap from drift.}

## Open questions
- {Anything the interview did not resolve, with who can resolve it if known}
```

## Rules

- **Priority is must / should / could.** "Must" means the product does not ship without it. If everything is "must", the interview is not finished.
- **Requirements, not features or tasks.** "The system sends a receipt within 60 seconds of payment" is a requirement. "Add email service" is a task; it belongs in a plan.
- **One row per requirement.** Split anything with an "and" in it that could be delivered separately.
- **Keep IDs stable.** Once `FR-7` is cited by the roadmap or a plan, do not renumber. Retire a requirement by striking it through with a note, not by deleting the row.
- **Rationale over repetition.** The rationale column should say which user or problem the requirement serves, so a reader can judge whether it still matters when circumstances change.
