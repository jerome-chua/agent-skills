---
name: add-logging
description: Audit the logging in an existing backend or frontend service and rewrite it to follow logging best practices - structured entries, correct levels, constant event messages with context fields, errors logged once with their cause, one canonical line per request, and no secrets or personal data - then add the log statements that are missing at boundaries and failure points. Works with the logging library the service already uses. Use when the user invokes /add-logging, or asks to add, fix, clean up, standardize, or review logging or log messages in a service.
argument-hint: "[path to a service, directory, or file] [--dry-run]"
---

# add-logging

Go through a service's code, find every place it logs or should log, and bring those places to one consistent standard. The result is a service whose logs a stranger can search during an incident: every entry is structured, says what happened, carries the identifiers needed to connect it to a request and a user, and contains nothing that must not be stored.

This skill changes logging only. It does not change control flow, error handling outcomes, or public interfaces, except where a rule below says to ask first.

Sources for the rules: Better Stack's [Logging Best Practices: 12 Dos and Don'ts](https://betterstack.com/community/guides/logging/logging-best-practices/), Stripe's [canonical log lines](https://stripe.com/blog/canonical-log-lines), Dave Cheney's [Let's talk about logging](https://dave.cheney.net/2015/11/05/lets-talk-about-logging), the [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), and the Twelve-Factor App's [Logs](https://12factor.net/logs) factor.

## Scope

- `$ARGUMENTS` names a service, directory, or file: work only inside it.
- No path: use the current project. In a monorepo with several services, list them and take them one at a time, starting with the one the conversation is about, or the backend service with the most traffic-facing code.
- `--dry-run`: do the survey and the audit, print the report, and change nothing.

Skip generated code, vendored dependencies, build output, and migrations. Leave test files alone unless a test asserts on log output that you changed.

## Step 1 - Survey what exists

Before changing anything, find out how this service logs today. The existing conventions win over the defaults in this skill wherever they are deliberate and consistent.

1. **Kind of code.** Backend, frontend, or both. The rules differ; see the two sections below.
2. **Logger.** Which library and how it is configured: output format, level, destination, any redaction or context helpers, any request middleware that already logs. Read the logger setup file in full.
3. **Call sites.** Search for every way the code writes a log: calls on the logger, plus the raw output calls that bypass it (`console.*`, `print`, `println`, `fmt.Print*`, `System.out`, `puts`, `echo`, `dbg!`). Count them by kind and by directory.
4. **Conventions in use.** Field naming (snake_case or camelCase), the names already used for the request ID, user ID, and error fields, the message style, and how levels are used.
5. **Consumers.** Search the repository for anything that reads the logs: alert rules, dashboards, log-based metrics, parsing scripts, and tests that match on message text. A message that an alert matches on is an interface.

If the service has no logging library, only raw output calls, pick the standard structured logger for the language (for example `log/slog` for Go, `pino` for Node.js, `structlog` or the standard `logging` module with a JSON formatter for Python) and ask before adding it, because it is a new dependency.

## Step 2 - Audit against the rules

Check every call site against the rules that apply. Record each violation with its file, line, the rule it breaks, and the fix.

### Rules for all code

1. **One logger.** All output goes through the service's logger. Replace raw output calls, except in command-line tools where printing is the program's user interface.
2. **Structured entries.** Each entry is a set of named fields, emitted as JSON in production. A human-readable format is fine in development if the logger is configured to switch.
3. **Constant message, variable fields.** The message is a fixed phrase naming the event. Everything that varies goes in fields. Write `log.info("order placed", order_id=order.id, total_cents=total)`, not `log.info(f"Order {order.id} placed for {total}")`. A constant message can be searched and counted; an interpolated one cannot.
4. **Messages say what happened and why.** "payment declined" with `reason="insufficient_funds"` beats "error in payment". No bare "failed", "here", "done", or "error". Name the operation and the outcome.
5. **Levels mean one thing each.**
   - `debug`: detail for a developer diagnosing one path. Off in production by default.
   - `info`: a significant business or lifecycle event that completed: a request served, an order placed, a job finished, the service started.
   - `warn`: something abnormal that the service recovered from, and that would matter if it kept happening: a retry, a fallback, a deprecated call, a limit nearly reached.
   - `error`: an operation failed and was not recovered. Someone may need to act.
   - `fatal`: the process cannot continue. Use only at startup or in the top-level handler.
   Expected outcomes are not errors. A user typing a wrong password or a validation failure is `info` or `warn`.
6. **Context on every entry.** Entries written while handling a request carry the request or correlation ID, and the user or tenant ID when one is known. Bind these to the logger once, at the point the request enters, using the library's context mechanism, so that individual calls do not repeat them.
7. **Consistent field names.** One name per concept across the service. Use the names already in use; where there are none, use `request_id`, `user_id`, `error`, `duration_ms`, and put units in the name of any number that has one.
8. **Never log secrets or personal data.** No passwords, tokens, API keys, session IDs, cookies, authorization headers, connection strings, encryption keys, payment card numbers, bank details, government ID numbers, or health data. Log an ID in place of an email address, name, or phone number. Never log a whole request body, header map, environment, config object, or user record; pick the safe fields. Where the library supports it, make sensitive types redact themselves (for example a `LogValuer` in Go, or a serializer in pino), so a field added later stays out of the logs.
9. **Guard against log injection.** Pass user-supplied values as fields, never as part of a format string or message.
10. **Keep logging off the hot path.** No log call inside a tight loop; log once after the loop with a count. Do not build an expensive value for an entry that the current level will discard.
11. **Timestamps.** ISO 8601 in UTC, set by the logger, never written by hand into the message.

### Rules for backend code

1. **Write to stdout or stderr.** The service does not open, rotate, or ship its own log files; the environment does. If the service does this today, report it and leave it in place.
2. **Log an error once, where it is handled.** A function that returns or rethrows an error does not also log it; it adds context to the error and passes it up. The handler at the boundary (the request handler, the job runner, the message consumer) logs it once, at `error`, with the error message, its type, the stack trace or wrapped cause chain, and the operation that failed. Remove log-and-rethrow pairs, which produce the same failure three times in the logs.
3. **No swallowed errors.** An empty `catch` or an ignored error return gets either a log entry at the right level, or a comment saying why ignoring it is correct. Do not change what the code does after catching.
4. **One canonical line per request.** At the end of every request, in middleware, emit one `info` entry that summarizes it: method, route template (not the raw path with IDs in it), status, `duration_ms`, request ID, user ID, and the handful of numbers that explain its cost, such as database query count and time. Add this if it is missing. Do the same for background jobs and consumed messages: one summary entry per unit of work.
5. **Propagate the request ID.** Read it from the incoming header if present, generate one if not, return it in the response, and send it on outgoing calls to other services.
6. **Log the boundaries.** Make sure these events have an entry: service start with version and effective configuration (safe fields only), graceful shutdown, each outgoing call that fails or is retried, authentication and authorization failures, input validation failures, and changes to permissions or other security-relevant state.
7. **Do not log what the canonical line already says.** Remove "entering function" and "request received" entries that duplicate it, or lower them to `debug`.

### Rules for frontend code

Browser and mobile clients are different: the user can read everything the code logs, and nothing reaches the team unless it is sent.

1. **No stray `console.*` in production.** Remove leftover debugging output. Route the logging that should stay through one small logger module that is silent, or `warn` and above, in production builds.
2. **Nothing sensitive in the console, ever.** Tokens, personal data, and full API responses are readable by anyone at the keyboard and by browser extensions.
3. **Report errors instead of printing them.** If the app already has an error reporting service or endpoint, send caught errors there with context: the route, the action being attempted, the release version, and the request ID from the failed API response. If it has none, say so in the report and ask before adding one.
4. **Catch what would otherwise vanish.** Make sure there is a global handler for uncaught errors and unhandled promise rejections, and an error boundary or the framework's equivalent around the app's top-level routes.
5. **Empty `catch` blocks on user actions get a report call**, and the user gets whatever error state the UI already shows. Do not invent new UI.
6. **Tie client to server.** Record the request ID from response headers on failed calls so a client error can be matched to the backend's canonical line.

## Step 3 - Report, then apply

Print the audit before editing: the survey findings in a few lines, then violations grouped by rule with counts and the worst examples, then the list of statements to add.

Then apply the fixes without waiting, unless one of these is true, in which case ask first and continue with everything that does not depend on the answer:

- `--dry-run` was given.
- A fix needs a new dependency, or replaces the logging library.
- A fix changes a message or field that a consumer from the survey depends on. Offer to update the consumer in the same change.
- A fix would change the production log format as a whole, such as plain text to JSON.
- The existing convention is consistent but conflicts with a rule, such as camelCase field names. Keep the convention unless told otherwise.

Order of work: secrets and personal data first, since those are live exposures; then the logger setup and request middleware, since later fixes rely on them; then call sites, directory by directory.

When editing call sites:

- Change the log call and nothing around it. Keep the behavior of the code identical.
- Do not add entries for their own sake. A function that can only fail by returning an error to a caller that logs it needs no logging.
- Do not add sampling, log shipping, retention, or metrics. If the audit shows high-volume entries or logs being used where a metric belongs, say so in the report.

## Step 4 - Verify and summarize

1. Run the project's formatter, linter, type check, and tests. Fix what the changes broke, including tests that assert on old log output.
2. Search again for the patterns from the audit and confirm the counts dropped to the exceptions you chose to leave.
3. If the service can be started locally, start it, make one request, and read the output: one canonical line, valid JSON, the request ID present, no sensitive values.

Finish with a short summary: what was changed by rule with counts, what was added, what was left alone and why, anything that needs a decision, and the results of the checks you ran. State plainly which checks you could not run. Do not commit unless asked.

## Example

Before, in a Node.js handler:

```js
try {
  console.log("charging user " + user.email + " with card " + card.number);
  const charge = await payments.charge(user, card, amount);
  console.log("done");
} catch (err) {
  console.log("error", err);
  throw err;
}
```

After:

```js
const charge = await payments.charge(user, card, amount);
request.log.info({ charge_id: charge.id, amount_cents: amount }, "payment charged");
```

The email address and card number are gone. The message is constant and the values are fields. The `catch` that logged and rethrew is removed, because the request error handler logs the failure once with its stack trace, and the request-scoped logger already carries `request_id` and `user_id`.
