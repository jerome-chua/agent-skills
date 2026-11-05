#!/usr/bin/env python3
"""Stop hook for the rea-spike skill. It pauses the build loop once when the context is nearly full.

Claude Code runs this script on every Stop event while the rea-spike hooks are
active. The script reads the session transcript and measures how much of the
context window the conversation has used. The first time the usage goes over
the threshold (default 50%), the script blocks the stop and sends a CONTEXT
CHECKPOINT instruction. The instruction tells Claude to do three things:

1. Commit the work.
2. Write spike/HANDOFF.md with the handoff skill.
3. Ask the user to choose: resume in a new chat, or continue in this one.

After spike/HANDOFF.md exists, the script stays silent for the rest of the
session. A user who replies "continue" can then run the loop until the context
window is full, with no more interruptions.

Environment variables:
  REA_SPIKE_HANDOFF_AT      The percent of the window that starts the checkpoint.
                            Default 50. Set "off" to disable the checkpoint.
  REA_SPIKE_CONTEXT_WINDOW  The size of the context window in tokens. Default
                            1,000,000 for models with extended context (Fable,
                            Opus 4.7 and later, Sonnet 5 and later, Haiku 5.5 and
                            later, or any "[1m]" variant). Otherwise 200,000.
  REA_SPIKE_PROJECT_DIR     The spike project directory. Set it only when the
                            project is not under the current directory.

Input: Claude Code sends JSON on stdin with transcript_path, session_id, and cwd.

Output: To block the stop, the script prints {"decision": "block", "reason": ...}
and exits 0. In every other case, it prints nothing and exits 0. The skill's own
prompt hook then makes the decision.
"""

import json
import os
import re
import sys
import tempfile
import time
from dataclasses import dataclass, fields
from enum import Enum

DEFAULT_THRESHOLD_PERCENT = 50.0
DEFAULT_WINDOW_TOKENS = 200_000
ONE_MILLION_WINDOW_TOKENS = 1_000_000
MAX_REMINDERS = 3
HANDOFF_MTIME_SLACK_SECONDS = 5  # tolerate small clock drift between fired_at and the file's mtime
SEARCH_DEPTH = 4
SKIPPED_DIRS = {".git", "node_modules", "target", "dist", "build", ".venv", "vendor"}


@dataclass(frozen=True)
class HookInput:
    """The fields Claude Code sends to a Stop hook on stdin."""

    transcript_path: str
    session_id: str
    cwd: str

    @classmethod
    def from_stdin(cls):
        """Parse the hook JSON. Bad or missing input gives empty fields, which main treats as a no-op."""
        try:
            raw = json.load(sys.stdin)
        except (json.JSONDecodeError, ValueError):
            raw = {}
        return cls(
            transcript_path=raw.get("transcript_path") or "",
            session_id=raw.get("session_id") or "unknown",
            cwd=raw.get("cwd") or os.getcwd(),
        )


def threshold_percent():
    raw = os.environ.get("REA_SPIKE_HANDOFF_AT", "").strip().lower()
    if raw == "off":
        return None
    try:
        return float(raw) if raw else DEFAULT_THRESHOLD_PERCENT
    except ValueError:
        return DEFAULT_THRESHOLD_PERCENT


# The Claude API returns a "usage" object with each response. It holds the token counts.
# Claude Code writes that response into the transcript as it is.
# The Anthropic docs define the fields here:
# https://platform.claude.com/docs/en/build-with-claude/prompt-caching#tracking-cache-performance
#
# A transcript has many lines that cannot hold a usage record: user messages, tool
# results, and file snapshots. We look for the raw text '"usage"' before we parse a line.
# The text check is fast. The JSON parse is slow. So most lines skip the parse.
TOKEN_USAGE_KEY = '"usage"'


def line_may_report_token_usage(transcript_line):
    return TOKEN_USAGE_KEY in transcript_line


def parse_transcript_line(transcript_line):
    """Return the line as a dict, or None when it is not valid JSON."""
    try:
        return json.loads(transcript_line)
    except json.JSONDecodeError:
        return None


@dataclass(frozen=True)
class TokenUsage:
    """The token counts from one Claude API response.

    The API splits the prompt into three parts and reports each part in its own field:
      cache_read_input_tokens      tokens the API read from the cache
      cache_creation_input_tokens  tokens the API wrote to the cache
      input_tokens                 tokens after the last cache breakpoint

    The input_tokens field alone is not the full prompt. The full size of the
    context is the sum of the three fields. The Anthropic docs give this formula:
    https://platform.claude.com/docs/en/build-with-claude/prompt-caching#tracking-cache-performance

    The Claude Code status line uses the same sum and shows it as
    context_window.total_input_tokens: https://code.claude.com/docs/en/statusline
    """

    input_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0

    @classmethod
    def from_api_response(cls, usage):
        """Build from the "usage" dict of an API response. A missing or null field counts as 0."""
        return cls(**{field.name: int(usage.get(field.name) or 0) for field in fields(cls)})

    @property
    def context_size(self):
        """The full size of the prompt the model saw, in tokens."""
        return self.input_tokens + self.cache_creation_input_tokens + self.cache_read_input_tokens


def latest_context_usage(transcript_path):
    """Return (TokenUsage, model_id) from the newest main-thread assistant message."""
    latest_usage, model_id = None, ""
    try:
        with open(transcript_path, encoding="utf-8") as transcript:
            for line in transcript:
                if not line_may_report_token_usage(line):
                    continue
                entry = parse_transcript_line(line)
                if entry is None:
                    continue
                if entry.get("type") != "assistant" or entry.get("isSidechain"):
                    continue
                usage = (entry.get("message") or {}).get("usage") or {}
                if not usage:
                    continue
                latest_usage = TokenUsage.from_api_response(usage)
                model_id = (entry.get("message") or {}).get("model") or model_id
    except OSError:
        return None, ""
    return latest_usage, model_id


# Model families that ship with a 1M-token window by default, keyed by the first
# (major.minor) version that has it. Older versions need an explicit "[1m]" variant.
EXTENDED_CONTEXT_SINCE = {"fable": (0, 0), "mythos": (0, 0), "opus": (4, 7), "sonnet": (5, 0), "haiku": (5, 5)}
MODEL_ID_PATTERN = re.compile(r"claude-(?P<family>[a-z]+)-(?P<major>\d+)(?:-(?P<minor>\d+))?")


def has_extended_context(model_id):
    lowered = model_id.lower()
    if "[1m]" in lowered:
        return True
    match = MODEL_ID_PATTERN.search(lowered)
    if not match:
        return False
    since = EXTENDED_CONTEXT_SINCE.get(match.group("family"))
    if since is None:
        return False
    version = (int(match.group("major")), int(match.group("minor") or 0))
    return version >= since


def context_window_tokens(model_id):
    override = os.environ.get("REA_SPIKE_CONTEXT_WINDOW", "").strip()
    if override.isdigit():
        return int(override)
    if has_extended_context(model_id):
        return ONE_MILLION_WINDOW_TOKENS
    return DEFAULT_WINDOW_TOKENS


class CheckpointStatus(str, Enum):
    """Where this session is in the checkpoint flow.

    Mixing in str keeps every member JSON-serializable as its plain value on any
    Python version, so the hook can write it straight into the state file. The
    values are private to this script; Claude Code does not define them.

    ARMED  Watching. The checkpoint has not fired in this session.
    FIRED  The checkpoint fired. The hook waits for spike/HANDOFF.md to appear.
    DONE   Finished for this session. The hook stays silent.
    """

    ARMED = "armed"
    FIRED = "fired"
    DONE = "done"

    def __str__(self):
        return self.value


def state_path(session_id):
    return os.path.join(tempfile.gettempdir(), f"rea-spike-checkpoint-{session_id}.json")


def new_state():
    return {"status": CheckpointStatus.ARMED, "reminders": 0, "fired_at": 0.0}


def load_state(path):
    """Read the state file. A missing, corrupt, or unknown status falls back to ARMED."""
    try:
        with open(path, encoding="utf-8") as state_file:
            state = json.load(state_file)
    except (OSError, json.JSONDecodeError):
        return new_state()
    try:
        state["status"] = CheckpointStatus(state.get("status"))
    except ValueError:
        state["status"] = CheckpointStatus.ARMED
    return state


def save_state(path, state):
    try:
        with open(path, "w", encoding="utf-8") as state_file:
            json.dump(state, state_file)
    except OSError:
        pass


def find_spike_file(root_dir, filename):
    """Find <something>/spike/<filename> within a few levels of root_dir; newest wins."""
    explicit_project = os.environ.get("REA_SPIKE_PROJECT_DIR", "").strip()
    candidates = []
    if explicit_project:
        candidates.append(os.path.join(explicit_project, "spike", filename))
    root_depth = root_dir.rstrip(os.sep).count(os.sep)
    for current_dir, child_dirs, child_files in os.walk(root_dir):
        child_dirs[:] = [name for name in child_dirs if name not in SKIPPED_DIRS and not name.startswith(".")]
        if current_dir.count(os.sep) - root_depth >= SEARCH_DEPTH:
            child_dirs[:] = []
        if os.path.basename(current_dir) == "spike" and filename in child_files:
            candidates.append(os.path.join(current_dir, filename))
    existing = [path for path in candidates if os.path.isfile(path)]
    if not existing:
        return None
    return max(existing, key=os.path.getmtime)


def block(reason):
    print(json.dumps({"decision": "block", "reason": reason}))


@dataclass(frozen=True)
class ContextFill:
    """How full the context window was at the latest API response in the transcript."""

    used_tokens: int
    window_tokens: int

    @property
    def percent_used(self):
        return self.used_tokens / self.window_tokens * 100.0


def measure_context_fill(transcript_path):
    """Read the transcript and work out how much of the window the latest response used.

    Returns None when the transcript has no usable token counts yet.
    """
    latest_usage, model_id = latest_context_usage(transcript_path)
    if latest_usage is None:
        return None
    return ContextFill(used_tokens=latest_usage.context_size, window_tokens=context_window_tokens(model_id))


def checkpoint_reason(context_fill, scope_path, reminder):
    """The instruction Claude receives when the stop is blocked. reminder is 0 the first time."""
    project_dir = os.path.dirname(os.path.dirname(scope_path))
    handoff_path = os.path.join(project_dir, "spike", "HANDOFF.md")
    lead = (
        f"CONTEXT CHECKPOINT (reminder {reminder} of {MAX_REMINDERS}): " if reminder else "CONTEXT CHECKPOINT: "
    )
    return (
        f"{lead}this conversation has used {context_fill.percent_used:.0f}% of its context window "
        f"({context_fill.used_tokens:,} of about {context_fill.window_tokens:,} tokens). "
        "Pause the rea-spike build loop now. "
        "This instruction overrides any keep-working reason from the completion evaluator: do not "
        "start or continue F-n work in this turn. Do these three things and nothing else: "
        "(1) commit any uncommitted work on the spike branch, do not push; "
        f"(2) invoke the handoff skill and save its document to {handoff_path}, following the "
        "'Context checkpoint' section of the rea-spike skill for its required contents, then commit it; "
        "(3) end the turn with a short message that begins with 'CONTEXT CHECKPOINT', gives the handoff "
        "document path, and offers the user two choices: open a new chat in the project directory and run "
        "/rea-spike with the same arguments to resume from the handoff, or reply 'continue' to keep building "
        "in this chat until the context window is exhausted (no further checkpoint will fire). Then stop."
    )


def handoff_written_since(fired_at, current_working_dir):
    """True when spike/HANDOFF.md exists and was modified at or after the checkpoint fired."""
    handoff_path = find_spike_file(current_working_dir, "HANDOFF.md")
    if not handoff_path:
        return False
    return os.path.getmtime(handoff_path) >= float(fired_at) - HANDOFF_MTIME_SLACK_SECONDS


def finish_session(state, state_file):
    """Mark the checkpoint done so the hook stays silent for the rest of this session."""
    state["status"] = CheckpointStatus.DONE
    save_state(state_file, state)


def fire_checkpoint(state, state_file, context_fill, scope_path):
    """First crossing of the threshold: record it, then block the stop with the checkpoint instruction."""
    state.update(
        {
            "status": CheckpointStatus.FIRED,
            "fired_at": time.time(),
            "reminders": 0,
            "fired_percent": context_fill.percent_used,
        }
    )
    save_state(state_file, state)
    block(checkpoint_reason(context_fill, scope_path, reminder=0))


def await_handoff(state, state_file, context_fill, scope_path, current_working_dir):
    """The checkpoint already fired. Stand down once the handoff exists, else remind up to MAX_REMINDERS times."""
    if handoff_written_since(state.get("fired_at", 0.0), current_working_dir):
        finish_session(state, state_file)
        return

    reminders_sent = int(state.get("reminders", 0))
    if reminders_sent >= MAX_REMINDERS:
        finish_session(state, state_file)
        print(
            "rea-spike context checkpoint: handoff document was never written after "
            f"{MAX_REMINDERS} reminders; standing down for this session.",
            file=sys.stderr,
        )
        return

    state["reminders"] = reminders_sent + 1
    save_state(state_file, state)
    block(checkpoint_reason(context_fill, scope_path, reminder=state["reminders"]))


def main():
    hook_input = HookInput.from_stdin()

    threshold = threshold_percent()
    checkpoint_disabled = threshold is None
    nothing_to_measure = not hook_input.transcript_path
    if checkpoint_disabled or nothing_to_measure:
        return

    scope_path = find_spike_file(hook_input.cwd, "SCOPE.md")
    not_a_rea_spike_project = scope_path is None
    if not_a_rea_spike_project:
        return

    state_file = state_path(hook_input.session_id)
    state = load_state(state_file)
    checkpoint_already_finished = state["status"] == CheckpointStatus.DONE
    if checkpoint_already_finished:
        return

    context_fill = measure_context_fill(hook_input.transcript_path)
    transcript_has_no_token_counts = context_fill is None
    if transcript_has_no_token_counts:
        return

    if state["status"] == CheckpointStatus.FIRED:
        await_handoff(state, state_file, context_fill, scope_path, hook_input.cwd)
    elif context_fill.percent_used >= threshold:
        fire_checkpoint(state, state_file, context_fill, scope_path)


if __name__ == "__main__":
    main()
