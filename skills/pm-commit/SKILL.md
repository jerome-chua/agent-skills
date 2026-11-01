---
name: pm-commit
description: Write a git commit message from a product manager's point of view, as one paragraph of at most 50 words, describing what changed and why it matters to users or the product. Use when the user invokes /pm-commit, or asks for a commit message for staged or recent changes.
argument-hint: "[ref, range, or description of the change]"
---

# pm-commit

Write the commit message a technical product manager would write: what changed, why it matters to users or the product, and enough technical detail to be specific. One paragraph, 50 words or fewer. Print it; do not commit unless asked.

## Find the change

Use the first of these that applies:

1. `$ARGUMENTS` is a commit, branch, or range: describe `git diff <range>` (for a single commit, `git show`).
2. `$ARGUMENTS` is prose: treat it as the author's summary and still read the diff to get the details right.
3. Staged changes exist (`git diff --cached --stat` is non-empty): describe only those, since that is what the commit will contain.
4. Otherwise describe the working tree: `git diff` plus untracked files from `git status --short`.

Read the diff, not just the file list. The message has to name real behavior, and the file list alone cannot tell you what changed for the user.

## Write the message

- Lead with the user-visible or product-visible outcome, then the mechanism. "Users can now export reports as CSV from the dashboard; adds an `/export` endpoint and a download button" rather than "Add export endpoint".
- Say why when the diff does not make it obvious: the bug being fixed, the metric being chased, the constraint being removed.
- Name the specific components, endpoints, flags, or screens involved, so an engineer can find the change from the message alone.
- One paragraph. No subject line, no bullets, no trailers, no type prefixes such as `feat:`.
- Plain words. No "various improvements", "minor fixes", or "refactoring" without saying what changed for whom.

## Check and deliver

Count the words before sending. If the message exceeds 50, cut detail from the mechanism, not from the outcome, until it fits.

Print the message in a fenced code block so it can be copied as is. If the user asks you to commit, run `git commit` with exactly that message. Never stage files or commit on your own.

## Example

Diff: adds retry with backoff to the payment webhook handler, plus a dead-letter queue for failures.

```
Payment webhooks that fail transiently are now retried three times with exponential backoff instead of being dropped, closing the gap where customers paid but orders stayed unpaid. Failures that exhaust retries land in a dead-letter queue so support can replay them from the admin console.
```
