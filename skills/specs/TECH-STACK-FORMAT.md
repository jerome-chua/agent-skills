# tech-stack.md Format

`specs/tech-stack.md` says how the product is built and what it must withstand. It owns the non-functional requirements and the system design. Every choice in it should point at the requirement that forced it.

## Template

```md
# Tech Stack: {Product}

## Non-functional requirements
| ID | Category | Requirement | Target |
|---|---|---|---|
| NFR-1 | Performance | {What must be fast} | {p95 under 300 ms at 100 req/s} |
| NFR-2 | Reliability | {What must not be lost or go down} | {99.9% monthly; no data loss on crash} |
| NFR-3 | Security | {What must be protected, from whom} | {…} |
| NFR-4 | Scale | {Expected load now and in 12 months} | {…} |
| NFR-5 | Compatibility | {Platforms, browsers, versions} | {…} |
| NFR-6 | Operability | {Observability, deploy, backup needs} | {…} |

## Stack
| Layer | Choice | Serves | Alternatives considered |
|---|---|---|---|
| Language / runtime | {…} | {NFR or FR IDs, or "team familiarity"} | {What else was weighed and why it lost} |
| Framework | {…} | … | … |
| Data store | {…} | … | … |
| Infrastructure / hosting | {…} | … | … |
| Auth | {…} | … | … |
| Testing | {…} | … | … |
| CI / CD | {…} | … | … |

## System design

### Components
{A Mermaid diagram or a short table: each component, what it owns, and what it talks to.}

### Core entities
| Entity | Key fields | Relationships |
|---|---|---|
| {…} | {…} | {…} |

### Data flow
{The main path through the system, step by step, for the most important FR. Name the component at each step.}

### Interfaces
{Public APIs, events, CLI commands, or integration points, with their shape. Enough for someone to build a client against; not the full reference.}

## Decisions
| ID | Decision | Rationale | Revisit when |
|---|---|---|---|
| D-1 | {A choice that was not obvious} | {Why, in terms of FR/NFR IDs or constraints} | {The condition under which it should be reopened} |

## Constraints and risks
- {Fixed constraints: budget, existing systems, team size, deadlines}
- {Risks in the design, and what would reduce them}

## Open questions
- {…}
```

## Rules

- **Every NFR has a target.** "Fast" and "secure" are not requirements. If the user cannot give a number, record the best estimate and mark it as an estimate.
- **Every choice names what it serves.** A stack row with nothing in "Serves" is a preference, not a decision. Preferences are fine; label them as such.
- **Design to the must-have FRs.** Size the architecture for the first roadmap phases plus the scale target in the NFRs, not for every "could".
- **Decisions are for the non-obvious.** Do not log "we used Git". Log the choices a new engineer would question, with the condition that would make you revisit them.
- **Use the codebase.** When a project already exists, the stack table describes what is there; design only what is new, and note where the existing system constrains it.
