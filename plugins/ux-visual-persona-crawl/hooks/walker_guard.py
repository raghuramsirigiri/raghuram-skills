#!/usr/bin/env python3
"""PreToolUse guard for the screen-walker agent: its shell may run only the eyes.py driver.

A walker that can run curl, cat a page's source or open another persona's report stops working by sight,
and its walk has to be thrown away. Telling it not to has not been enough, so this hook refuses every Bash
command from a screen-walker that is not one driver command. Calls from any other agent pass untouched.

Allowed, one command per call:
    python "<...>/eyes.py" <look|zoom|measure|act|feedback|brief|status|start|stop> [args]
optionally fed by  echo '<json>' |  or a  <<'EOF' ... EOF  heredoc. No ; && || > backticks or $( ).

Plugin subagents ignore `hooks` in their own frontmatter, so this runs from the plugin's hooks.json and
picks out the walker by the `agent_type` field of the hook input.
"""
import json
import re
import shlex
import sys

DRIVER_COMMANDS = {"look", "zoom", "measure", "act", "feedback", "brief", "status", "start", "stop"}
PYTHON = re.compile(r"^(python(3(\.\d+)?)?|py)(\.exe)?$", re.I)
ECHO_PREFIX = re.compile(r"^\s*echo\s+'[^']*'\s*\|\s*")
HEREDOC = re.compile(r"\s*<<-?\s*(['\"]?)(\w+)\1\s*$")
SHELL_META = re.compile(r"[;&|<>`]|\$\(")


def is_walker(event: dict) -> bool:
    kind = str(event.get("agent_type") or "")
    return kind == "screen-walker" or kind.endswith(":screen-walker")


def refusal(command: str):
    """None if the command is one eyes.py driver call, else the reason it is refused."""
    first, _, rest = command.strip().partition("\n")
    m = HEREDOC.search(first)
    if m:
        body = rest.rstrip()
        if not body.endswith(m.group(2)):
            return "the heredoc is not closed"
        first = first[: m.start()]
    elif rest.strip():
        return "one command per call"
    first = ECHO_PREFIX.sub("", first, count=1)
    if SHELL_META.search(first):
        return "no pipes, redirects, chaining or substitutions besides echo '<json>' | or a heredoc"
    try:
        argv = shlex.split(first, posix=True)
    except ValueError as exc:
        return f"could not read the command ({exc})"
    if len(argv) < 3:
        return "expected python <path>/eyes.py <command> ..."
    exe = re.split(r"[\\/]", argv[0])[-1]
    if not PYTHON.match(exe):
        return f"only Python running eyes.py is allowed, not {exe}"
    if re.split(r"[\\/]", argv[1])[-1] != "eyes.py":
        return "the only script you may run is the eyes.py driver"
    if argv[2] not in DRIVER_COMMANDS:
        return f"eyes.py {argv[2]} is not a walker command"
    return None


def main():
    try:
        event = json.load(sys.stdin)
    except ValueError:
        return 0
    if event.get("tool_name") != "Bash" or not is_walker(event):
        return 0
    command = str((event.get("tool_input") or {}).get("command") or "")
    why = refusal(command)
    if why is None:
        return 0
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            f"Refused: {why}. A screen-walker's shell runs only the eyes.py commands in its brief, one per call. "
            "You see the site only through the screenshots those commands name."),
    }}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
