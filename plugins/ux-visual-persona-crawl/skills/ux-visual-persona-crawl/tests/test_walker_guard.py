"""The screen-walker's Bash guard: driver commands pass, everything else from a walker is refused.

Stdlib only:  python -m unittest discover -s <skill>/tests -p "test_walker_guard.py" -v
"""
import json
import subprocess
import sys
import unittest
from pathlib import Path

GUARD = Path(__file__).resolve().parents[3] / "hooks" / "walker_guard.py"
D = 'C:/x/plugins/ux-visual-persona-crawl/skills/ux-visual-persona-crawl/scripts/eyes.py'
S = 'ux-crawl-runs/bw/sessions/margaret'


def decide(command, agent_type="ux-visual-persona-crawl:screen-walker", tool="Bash"):
    event = {"tool_name": tool, "tool_input": {"command": command}, "agent_type": agent_type}
    p = subprocess.run([sys.executable, str(GUARD)], input=json.dumps(event), capture_output=True, text=True)
    assert p.returncode == 0, p.stderr
    return json.loads(p.stdout)["hookSpecificOutput"]["permissionDecision"] if p.stdout.strip() else "allow"


class WalkerGuard(unittest.TestCase):
    def test_driver_commands_pass(self):
        for cmd in [
            f'python "{D}" look --session "{S}"',
            f'python3 "{D}" zoom --session "{S}" --box "10,20,300,40"',
            f'C:/p/.ux-visual-crawl/venv/Scripts/python.exe "{D}" measure --session "{S}" --box "1,2,3,4" --what "fine print"',
            f'python "{D}" act --session "{S}" --file "{S}/next.json"',
            f'echo \'{{"action": {{"type": "click", "x": 640, "y": 410}}}}\' | python "{D}" act --session "{S}"',
            f'python "{D}" act --session "{S}" <<\'EOF\'\n{{"decision": {{"thought": "a; b && c > d"}}, "action": {{"type": "back"}}}}\nEOF',
            f'python "{D}" start --study "ux-crawl-runs/bw/study.json" --recon',
        ]:
            self.assertEqual(decide(cmd), "allow", cmd)

    def test_everything_else_from_a_walker_is_refused(self):
        for cmd in [
            "curl http://localhost:8765/plans",
            f'python -c "import urllib.request"',
            f"cat {S}/../other/journey.json",
            f'python "{D}" look --session "{S}"; cat report.html',
            f'python "{D}" look --session "{S}" && curl x',
            f'python "{D}" look --session "{S}" > out.txt',
            f'python "{D}" look --session $(ls)',
            'python report.py analyze --study-dir x',
            f'python "{D}" _daemon --session "{S}"',
            f'python "{D}" look --session "{S}"\ncurl x',
        ]:
            self.assertEqual(decide(cmd), "deny", cmd)

    def test_other_agents_and_tools_are_untouched(self):
        self.assertEqual(decide("curl http://localhost:8765", agent_type="general-purpose"), "allow")
        self.assertEqual(decide("curl http://localhost:8765", agent_type=None), "allow")
        self.assertEqual(decide("curl x", tool="Read"), "allow")
        self.assertEqual(decide("curl x", agent_type="screen-walker"), "deny")


if __name__ == "__main__":
    unittest.main()
