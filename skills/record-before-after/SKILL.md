---
name: record-before-after
description: Record a side-by-side before/after video of a UI change. Reads the ticket to learn what to test, runs the base branch (in a git worktree) and the current feature branch as two live apps, clicks through the same flow on both in a recorded headless browser, and stitches the two recordings into one captioned MP4, with optional spoken narration. Use when the user invokes /record-before-after, or asks for a before/after video, a demo recording, or a visual comparison of a branch or pull request against its base.
argument-hint: "[ticket id or URL] [--base <branch>] [--narrate]"
---

# record-before-after

Show a reviewer what a branch changes, without making them check it out. The result is one MP4: the base branch on the left, the feature branch on the right, both doing the same steps at the same time, with a caption under each step.

The work has two halves. First you **explore** both apps slowly and decide the steps. Then two scripts **replay** those steps with recording on. Nothing you do while thinking is recorded, so the video is short and both sides stay in step.

Scripts live in `${CLAUDE_PLUGIN_ROOT}/skills/record-before-after/scripts/` (called `$SCRIPTS` below). If `CLAUDE_PLUGIN_ROOT` is not set, use the `scripts/` folder beside this file.

## Inputs

- **Ticket** (optional): an id (`ENG-123`, `#45`) or URL. See step 2 for what happens without one.
- `--base <branch>` (optional): the branch to compare against. Default: the repository's default branch.
- `--narrate` (optional): add a spoken voice-over. See step 7.

## Workflow

Create the run directory first: `/tmp/YYYY-MM-DD-before-after-<slug>/` (today's date, slug from the ticket or branch). Every file below goes there. It is outside the repository so nothing reaches version control.

### 1. Preflight

Check, and stop to ask the user before installing anything that is missing:

- `node --version` (18 or later).
- `ffmpeg` and `ffprobe` on the PATH. On macOS: `brew install ffmpeg`. The copy of ffmpeg that ships inside Playwright cannot encode MP4; do not try to use it.
- Playwright with Chromium in `~/.cache/before-after/`, never in the project:
  ```bash
  mkdir -p ~/.cache/before-after && cd ~/.cache/before-after \
    && npm init -y && npm install playwright && npx playwright install chromium
  ```
- A clean way back: note the current branch and run `git worktree list`.

### 2. Find the ticket and write the test brief

Resolve the ticket in this order and stop at the first hit:

1. The argument the user passed.
2. An id in the branch name (`feature/ENG-123-export-csv`).
3. The open pull request for this branch: `gh pr view --json title,body,closingIssuesReferences`.

Fetch it with whatever is available: a Linear, Jira, or GitHub MCP tool, or `gh issue view`. If there is no ticket, use the diff and the commit messages, and say so in the final report.

Then read `git diff $(git merge-base <base> HEAD)...HEAD` plus uncommitted changes. Write `brief.md` in the run directory:

- one sentence on what changes for the user;
- the acceptance criteria that can be **seen** in a browser, in the order a user would meet them;
- the starting URL and any data the flow needs (a logged-in user, an existing record).

If nothing in the change is visible in a browser, stop and tell the user; a video would show nothing.

### 3. Start both apps

Read `.before-after.json` at the repository root ([format](CONFIG-FORMAT.md)). If it does not exist, work out the values from `package.json`, the README, and `CLAUDE.md`, show them to the user once for confirmation, and write the file.

- **Before**: `git worktree add --detach <run dir>/worktree-before $(git merge-base <base> HEAD)`. Copy each `copyFiles` entry into it, run `install` there, then run `start` with the before port.
- **After**: the current checkout as it is, uncommitted work included. Run `start` with the after port. Do not create a second worktree.

Start both servers in the background and wait until each `readyPath` answers. Use two ports that are free; do not stop a server the user already has running.

### 4. Explore both sides, in parallel, unrecorded

Launch two subagents in one message, one per URL. Give each the text of `brief.md`, its URL, and which side it has. Each one drives the app with whatever browser tool is available (a Playwright MCP, a built-in browser, or short Playwright scripts that take screenshots, loaded from `~/.cache/before-after`). Each reports:

- the exact path through the flow: URL, the element for each action (prefer role and visible text over CSS classes), the text it typed;
- what the screen shows after each action that proves the action worked;
- where the flow stops being possible on its side, and what the user sees there.

Without subagents, explore the two sides yourself, one after the other.

### 5. Write the shared flow

Merge the two reports into three files in the run directory.

`steps.json`, one list for both sides:

```json
[
  { "id": "open-orders", "caption": "Open the orders page", "narration": "We start on the orders page." },
  { "id": "export", "caption": "Export the orders as a CSV file", "narration": "The new Export button downloads every order as a CSV file." }
]
```

- 4 to 10 steps. One user-visible action per step.
- `caption`: 12 words or fewer, says what the viewer should notice. It is shown under the video.
- `narration` (optional): one or two spoken sentences. Falls back to the caption.
- Order the steps so the change itself comes early; cut setup that proves nothing.

`flow.before.mjs` and `flow.after.mjs`, one function per step id:

```js
export default {
  'open-orders': async (page) => {
    await page.goto('/orders');
    await page.getByRole('heading', { name: 'Orders' }).waitFor();
  },
  'export': async (page) => {
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByText('Export ready').waitFor();
  },
};
```

- **Leave a step out of a file when that side cannot do it.** The video then holds that side's last frame under a "Not available before this change" label while the other side performs the step. This is the normal case for a new feature. Never fake a step.
- `page.goto` takes paths; the script supplies the base URL.
- End every step by waiting for the thing that proves it worked. Never use fixed sleeps to wait for the app.
- Make actions watchable: `locator.hover()` before a click that matters, and `locator.pressSequentially(text, { delay: 40 })` rather than `fill` for text the viewer should read.
- Each function gets `(page, { baseURL, side })`.

### 6. Record both sides in parallel

Run both commands at the same time:

```bash
node "$SCRIPTS/record.mjs" --side before --url http://localhost:<before port> --dir <run dir>
node "$SCRIPTS/record.mjs" --side after  --url http://localhost:<after port>  --dir <run dir>
```

Add `--login <path>` when the config has a `login` module, and `--viewport WxH` when it sets one (both sides must match).

Each run writes `<side>.webm` and `<side>.timings.json`. The script flashes a colour marker before the flow (cut from the final video) to line its step times up with the video; if the timings file contains `syncWarning`, record that side again. On a failed step the script exits 1, names the step, and saves `<side>.failure.png`. Read the screenshot, fix that side's flow file, and record that side again. If the same step fails three times, stop and report it; do not delete the step to make the run pass.

### 7. Stitch

```bash
node "$SCRIPTS/stitch.mjs" --dir <run dir> --before-label <base branch> --after-label <feature branch> [--narrate]
```

This writes `before-after.mp4` and `captions.srt`. Labels and captions use Excalidraw's hand-drawn font; pass `--font system` for a plain font, or `--font <path to a font file>` for another one. Each step lasts as long as the slower side, the time needed to read the caption, or the narration, whichever is longest; the faster side holds its last frame.

`--narrate` adds a voice reading each step's `narration`. The voice comes from OpenAI if `OPENAI_API_KEY` is set, else ElevenLabs if `ELEVENLABS_API_KEY` is set, else the macOS `say` command. **The first two send the narration text to that company.** Tell the user which voice will be used before you run it, and pass `--tts local` if they want the text to stay on the machine.

### 8. Check the video

Do not hand over a video you have not looked at. Pull one frame from the middle of each step (times are in `captions.srt`) and read the images:

```bash
ffmpeg -loglevel error -ss <seconds> -i <run dir>/before-after.mp4 -frames:v 1 <run dir>/check-<n>.png
```

Confirm that both panes show the app (not a blank or error page), the caption matches what is on screen, and the changed behaviour is actually visible. Fix the flow and record again if not.

### 9. Clean up

Always, including after a failure: stop both servers you started, then `git worktree remove --force <run dir>/worktree-before`. Confirm with `git worktree list`. Leave the user's branch and working tree exactly as they were.

### 10. Deliver

Open the MP4 (`open` on macOS) and report: the full path of the video, what each side shows, any step that only one side could do, and whether a ticket was found.

Then ask whether to attach the video to the ticket or pull request. **Never upload it without a yes**; recordings can show real data. With a yes: attach it through the tracker's MCP tool if there is one. GitHub has no API for uploading a video to a pull request, so give the user the file path to drag into the comment box.

## Rules

- The recording must show the real apps. Do not edit either branch, stub responses, or change data to make the difference look larger.
- Both sides get the same viewport, the same data, and the same steps in the same order.
- If the before and after videos look the same, say so. That is a finding, not a failure to hide.
- Do not commit the run directory, the worktree, or the recordings. `.before-after.json` is the only file this skill adds to the repository; mention it so the user can decide to commit it.
