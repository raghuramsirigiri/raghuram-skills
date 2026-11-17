"""eyes.py check's robots.txt report, and a smoke test of the Ledgerly trial fixture. Stdlib only.

    python -m unittest discover -s <skill>/tests -p "test_robots.py" -v
"""
import socket
import subprocess
import sys
import time
import unittest
import urllib.parse
import urllib.request
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SERVER = SKILL / "evals" / "fixtures" / "trial-site" / "server.py"
sys.path.insert(0, str(SKILL / "scripts"))
import eyes as driver  # noqa: E402


def setUpModule():
    global BASE, _server
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    _server = subprocess.Popen([sys.executable, str(SERVER), "--port", str(port)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    BASE = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE + "/", timeout=1)
            return
        except OSError:
            time.sleep(0.2)


def tearDownModule():
    _server.terminate()


class Robots(unittest.TestCase):
    def test_verdicts(self):
        self.assertEqual(driver.robots_verdict(BASE + "/pricing")["verdict"], "allowed")
        self.assertEqual(driver.robots_verdict(BASE + "/signup/billing")["verdict"], "disallowed")

    def test_missing_and_unreachable(self):
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            dead = s.getsockname()[1]
        self.assertEqual(driver.robots_verdict(f"http://127.0.0.1:{dead}/", timeout=1)["verdict"], "unreachable")

    def test_test_hosts_are_skipped(self):
        study = {"start_url": BASE + "/signup/billing", "allowed_hosts": ["127.0.0.1", "localhost"]}
        self.assertEqual(driver.robots_report(study), {})


class TrialFixture(unittest.TestCase):
    def post(self, path, **form):
        data = urllib.parse.urlencode(form).encode()
        return urllib.request.urlopen(urllib.request.Request(BASE + path, data=data), timeout=3)

    def test_pages_and_password_rule(self):
        for path in ("/", "/pricing", "/pricing?billing=monthly", "/signup?plan=team", "/signup/plan?plan=team",
                     "/signup/billing", "/welcome", "/terms"):
            self.assertEqual(urllib.request.urlopen(BASE + path, timeout=3).status, 200, path)
        weak = self.post("/signup", name="A", email="test@example.com", password="short", plan="team", fails="0")
        self.assertIn(b'class="bad"', weak.read())
        common = self.post("/signup", name="A", email="test@example.com", password="TestPass-2024", plan="team", fails="0")
        self.assertIn(b'class="bad"', common.read())
        ok = self.post("/signup", name="A", email="test@example.com", password="longenough1", plan="team", fails="0")
        self.assertTrue(ok.geturl().endswith("/signup/plan?plan=team"))


if __name__ == "__main__":
    unittest.main()
