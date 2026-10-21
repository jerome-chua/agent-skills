---
name: clean-code
description: Write and refactor code that is clean, DRY, and follows SOLID, with obvious, human-readable names and no single-character variables. Use whenever writing, editing, or refactoring code, or when the user invokes /clean-code, optionally with a file, directory, or diff to review.
argument-hint: [file | directory | diff]
---

# clean-code

Write code that a new teammate can read once and understand. Favor clarity over cleverness, one source of truth over copies, and small focused units over large ones.

## Modes

- **No argument**: apply every rule below to all code you write or change in this session.
- **File, directory, or diff in `$ARGUMENTS`**: review that code. List each violation under the rule it breaks, with `file:line`. Then fix the violations. Ask before a refactor that changes public interfaces or touches many files.

## Naming

- Name things for what they are or do: `unpaidInvoices`, not `list2`; `calculateShippingCost`, not `doCalc`.
- Booleans read as yes/no questions: `isActive`, `hasPermission`, `shouldRetry`.
- Functions and methods start with a verb: `fetchUser`, `validateEmail`, `renderHeader`.
- Do not abbreviate. Universal terms like `id`, `url`, `html`, and `api` are fine.
- **Never use single-character names, including loop variables and lambda parameters.**
  - `for (let userIndex = 0; userIndex < users.length; userIndex++)`, not `for (let i = 0; …)`.
  - `for order in orders:`, not `for o in orders:`.
  - `items.reduce((total, item) => total + item.price, 0)`, not `(a, b) => a + b.price`.
  - `catch (error)`, not `catch (e)`.
- Iterate over elements directly instead of over indices when the index is not needed.
- Narrow exceptions, used only where a longer name would hurt clarity:
  - Math that mirrors a known formula or coordinate system (`x`, `y`, `z`).
  - `_` for a value the language forces you to receive but you discard.
  - Generic type parameters (`T`, `K`, `V`).
- Use the domain's vocabulary consistently. One concept gets one name across the codebase.

## DRY (Don't Repeat Yourself)

- Extract logic into a function or constant once it repeats **with the same meaning**.
- Do not merge code that only looks alike but changes for different reasons. A wrong abstraction is worse than duplication.
- Replace magic numbers and strings with named constants: `MAX_LOGIN_ATTEMPTS = 5`.
- Keep one source of truth for configuration, schemas, and business rules.

## SOLID

- **Single Responsibility**: each module, class, or function has one reason to change. Split a function that fetches, transforms, and renders into three.
- **Open/Closed**: add behavior by adding code, not by editing a growing `if`/`switch`. Use a lookup map or polymorphism when the cases keep growing.
- **Liskov Substitution**: a subtype must work anywhere its parent works. Do not override a method to throw "not supported".
- **Interface Segregation**: keep interfaces small and specific. Callers should not depend on methods they never use.
- **Dependency Inversion**: depend on abstractions you pass in (a repository, a client) instead of constructing concrete dependencies inside business logic. This also makes code testable.

Apply SOLID where it reduces coupling or makes change easier. Do not add layers, interfaces, or factories to a small script that does not need them.

## Basics

- Keep functions small, with one job each, at one level of abstraction.
- Keep parameter lists short. Group related parameters into an object after about three.
- Use early returns and guard clauses instead of deep nesting.
- Delete dead code and commented-out code. Git keeps the history.
- Comments explain **why**, not what. If code needs a "what" comment, rename or restructure it instead.
- Handle errors explicitly. Do not swallow exceptions silently.
- Follow the existing codebase's conventions first: its formatting, naming style, and patterns win over personal preference.

## Example

Before:

```js
function f(d) {
  let t = 0;
  for (let i = 0; i < d.length; i++) {
    if (d[i].s === "paid") t += d[i].a * 1.08;
  }
  let t2 = 0;
  for (let i = 0; i < d.length; i++) {
    if (d[i].s === "pending") t2 += d[i].a * 1.08;
  }
  return [t, t2];
}
```

After:

```js
const SALES_TAX_RATE = 0.08;

function totalWithTax(invoices, status) {
  return invoices
    .filter((invoice) => invoice.status === status)
    .reduce((total, invoice) => total + invoice.amount * (1 + SALES_TAX_RATE), 0);
}

function summarizeInvoiceTotals(invoices) {
  return {
    paidTotal: totalWithTax(invoices, "paid"),
    pendingTotal: totalWithTax(invoices, "pending"),
  };
}
```

## Before you finish

Check the code you wrote or changed:

1. Does every name say what it holds or does? Are there any single-character names left?
2. Is any logic or constant duplicated with the same meaning?
3. Does each function do one thing, with a short parameter list and shallow nesting?
4. Are there SOLID smells: a growing `switch`, a class with many reasons to change, or hard-wired dependencies?
5. Does the code match the surrounding codebase's conventions?
