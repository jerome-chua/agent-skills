# `.before-after.json` format

One file at the repository root. It records how to run the project twice at the same time, so the skill asks only once. It holds no secrets; commit it if the team wants to share it.

```json
{
  "install": "npm ci",
  "start": "npm run dev -- --port {port}",
  "ports": { "before": 4101, "after": 4102 },
  "readyPath": "/",
  "copyFiles": [".env.local"],
  "login": "scripts/before-after-login.mjs",
  "viewport": "1280x720"
}
```

| Field | Required | Meaning |
|---|---|---|
| `install` | yes | Command that installs dependencies. Run inside the before worktree only; the current checkout is assumed to be installed. |
| `start` | yes | Command that starts the app. `{port}` is replaced with the port for that side. If the app takes its port from an environment variable, write it inline: `PORT={port} npm start`. |
| `ports` | yes | Two free ports. Pick ones the project does not normally use, so a dev server the user already runs is left alone. |
| `readyPath` | yes | Path that answers with a 2xx or 3xx status once the app is ready. |
| `copyFiles` | no | Untracked files the app needs, copied from the checkout into the before worktree (env files, local certificates). Paths are relative to the repository root. |
| `login` | no | Path to a module whose default export is `async (page, { baseURL, side }) => {}`. It runs before the first step on both sides and is not shown in the video. Read credentials from environment variables; never write them in this file or the module. |
| `viewport` | no | Size of each pane, `WIDTHxHEIGHT`. Default `1280x720`. |

## Notes

- **Shared backends.** If both sides talk to the same database or API, a step that writes data on one side changes what the other side shows. Prefer flows that read, or give each side its own data (a second database URL in the `start` command) and say so in the report.
- **Several services.** When the app needs more than one process, make `start` a single command that runs them all (a script, or `docker compose`), parameterised by `{port}`.
- **Schema changes.** When the feature branch has migrations, the before worktree needs a database at the old schema. Stop and ask the user how they want that handled; do not migrate a shared database backwards.
