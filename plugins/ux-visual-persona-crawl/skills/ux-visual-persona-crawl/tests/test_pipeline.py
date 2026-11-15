"""End-to-end checks of eyes.py and report.py against the demo site, with scripted walks and no agents.

Run with the project's venv Python (it needs Playwright and Pillow):

    .ux-visual-crawl/venv/Scripts/python.exe -m unittest discover -s <skill>/tests -v

The demo site is started on a free port for the run. Each test works in its own temporary study folder.
The test itself may look up a button's position in the page's markup to aim a scripted click; the driver never does.
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
EYES, REPORT = SKILL / "scripts" / "eyes.py", SKILL / "scripts" / "report.py"
SERVER = SKILL / "evals" / "fixtures" / "demo-site" / "server.py"
PY = sys.executable
DEC = {"thought": "t", "read": [], "clarity": 3, "trust": 3, "effort": 2, "doubts": [], "friction": [], "est_seconds": 5}
FEEDBACK = {"ease": 3, "meets_needs": 3, "easy_to_use": 3, "recommend": 5, "satisfaction": 3, "one_word": "meh",
            "best_thing": "b", "worst_thing": "w", "what_would_fix_it": "f", "would_return": "maybe", "quote": "q",
            "reasons": {k: "the offer button at step 2 did nothing" for k in
                        ("ease", "meets_needs", "easy_to_use", "recommend", "satisfaction")}}
BASE = ""
TMP = None


def run(script, *args, payload=None):
    p = subprocess.run([PY, str(script), *map(str, args)], input=json.dumps(payload) if payload else None,
                       capture_output=True, text=True, encoding="utf-8")
    return p.returncode, (p.stdout + p.stderr).strip()


def eyes(*args, payload=None):
    return run(EYES, *args, payload=payload)


def report(*args):
    return run(REPORT, *args)


def jrun(*args, payload=None):
    rc, out = eyes(*args, payload=payload)
    if rc:
        raise AssertionError(f"eyes.py {args[0]} failed: {out[:400]}")
    return json.loads(out)


def setUpModule():
    global BASE, TMP, _server
    # The venv sits in .ux-visual-crawl/, beside the browsers setup_env.py installed.
    root = next((p for p in Path(PY).resolve().parents if p.name == ".ux-visual-crawl"), None)
    if root and (root / "browsers").is_dir():
        os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(root / "browsers"))
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    _server = subprocess.Popen([PY, str(SERVER), "--port", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    BASE = f"http://localhost:{port}"
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE + "/offers", timeout=1)
            break
        except OSError:
            time.sleep(0.2)
    TMP = Path(tempfile.mkdtemp(prefix="uxcrawl-test-"))


def tearDownModule():
    _server.terminate()
    shutil.rmtree(TMP, ignore_errors=True)


def study(name, **over):
    d = TMP / name
    d.mkdir()
    s = {"id": name, "product": "demo", "mode": "observe_only", "start_url": BASE + "/offers",
         "allowed_hosts": ["localhost"], "goal": "x", "max_steps": 12,
         "stages": [{"id": "offers", "label": "Offers", "match": "/offers$"}], **over}
    (d / "study.json").write_text(json.dumps(s), encoding="utf-8")
    return d


def personas(d, people):
    base = {"name": "N", "task": "Find out what the offer is", "gives_up_when": ["x"], "demographics": {"age_band": "35-44"}, "lacks": ["y"]}
    people = [dict(base, **p) for p in people]
    (d / "personas.json").write_text(json.dumps(people), encoding="utf-8")
    return d / "personas.json"


def dead_button_xy():
    """Where 'Get this offer' sits on a 1280x800 desktop screen, for aiming a scripted click."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(BASE + "/offers")
        bb = pg.get_by_text("Get this offer", exact=True).bounding_box()
        b.close()
    return {"x": round(bb["x"] + bb["width"] / 2), "y": round(bb["y"] + bb["height"] / 2)}


class Pixels(unittest.TestCase):
    def test_a_tick_next_to_the_pointer_counts_as_a_response(self):
        import importlib.util
        import io
        try:
            from PIL import Image, ImageDraw
        except ImportError:
            self.skipTest("Pillow not installed")
        spec = importlib.util.spec_from_file_location("eyes_mod", EYES)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        def png(tick):
            img = Image.new("RGB", (1280, 800), "white")
            d = ImageDraw.Draw(img)
            d.rectangle([600, 400, 616, 416], outline="black")
            if tick:
                d.line([(603, 408), (607, 413), (614, 402)], fill="black", width=1)
            buf = io.BytesIO()
            img.save(buf, "PNG")
            return buf.getvalue()

        before, after = png(False), png(True)
        self.assertTrue(mod.local_change(before, after, 608, 408))
        self.assertFalse(mod.local_change(before, before, 608, 408))


class Study(unittest.TestCase):
    def test_hosts_with_ports_are_test_systems(self):
        d = study("hosts", allowed_hosts=["localhost:1234", "http://localhost/"])
        c = jrun("check", "--study", d / "study.json")
        self.assertEqual(c["hosts"], ["localhost"])
        self.assertEqual(c["treated_as"], "test system")
        self.assertEqual(c["pace_ms"], 300)
        live = study("live-hosts", start_url="https://www.example.com/x", allowed_hosts=["https://www.example.com:443/x"])
        c = jrun("check", "--study", live / "study.json")
        self.assertTrue(c["treated_as"].startswith("live"))
        self.assertEqual(c["pace_ms"], 1200)

    def test_report_command_points_at_real_files(self):
        c = jrun("check", "--study", study("cmd") / "study.json")
        paths = re.findall(r'"([^"]+)"', c["report_command"])
        self.assertEqual(len(paths), 2)
        self.assertTrue(all(Path(p).exists() for p in paths))

    def test_each_persona_gets_its_own_test_values(self):
        sys.path.insert(0, str(EYES.parent))
        import eyes as driver
        st = {"mode": "test_env", "test_data": {"email": "test+{persona}@example.com", "phone": "07000000000", "meter": "0"}}
        self.assertEqual(driver.test_values(st, {"test_data": {"phone": "07000000002"}}, "a-2"),
                         {"email": "test+a-2@example.com", "phone": "07000000002", "meter": "0"})
        d = study("shared-values", mode="test_env", environment_confirmation="test suite", test_data=st["test_data"])
        p = personas(d, [{"id": "a", "test_data": {"phone": "07000000001"}}, {"id": "b", "test_data": {"phone": "07000000002"}}])
        warned = [w for w in jrun("check", "--study", d / "study.json", "--personas", p)["warnings"] if "same" in w]
        self.assertEqual(len(warned), 1)
        self.assertIn("test:meter", warned[0])
        self.assertNotIn("test:email", warned[0])
        self.assertNotIn("test:phone", warned[0])

    def test_persona_lint(self):
        d = study("lint")
        bad = TMP / "lint" / "bad.json"
        bad.write_text(json.dumps([{"id": "a-very-long-persona-id-over-limit", "name": "A", "task": "t", "device": "tablet"},
                                   {"id": "x", "task": "t", "browser_zoom": 125, "vision": "x-ray", "cpu": "fast"},
                                   {"id": "X", "name": "dup", "task": "t"}]), encoding="utf-8")
        rc, out = eyes("check", "--study", d / "study.json", "--personas", bad)
        self.assertNotEqual(rc, 0)
        self.assertGreaterEqual(len(json.loads(out)["errors"]), 7)
        good = personas(d, [{"id": "a", "cpu": "slow", "network": "normal", "device": "mobile"}])
        rc, out = eyes("check", "--study", d / "study.json", "--personas", good)
        self.assertEqual(rc, 0, out)


class Sessions(unittest.TestCase):
    def test_start_all_writes_filled_briefs(self):
        d = study("briefs", mode="test_env", environment_confirmation="test suite", test_data={"email": "a"})
        p = personas(d, [{"id": f"p{i}", "device": "mobile" if i % 2 else "desktop"} for i in range(3)])
        out = jrun("start", "--study", d / "study.json", "--personas", p, "--all")
        try:
            self.assertEqual(len(out["sessions"]), 3)
            for row in out["sessions"]:
                brief = (Path(row["session"]) / "brief.md").read_text(encoding="utf-8")
                self.assertIn("brief.md", row["walker_prompt"])
                self.assertFalse(re.search(r"\[[A-Z][A-Z' ]+\]", brief), "unfilled placeholder")
                self.assertIn("`test:email`", brief)
                self.assertIn(row["session"], brief)
                self.assertIn("file-reading tool", brief)
            st = jrun("status", "--study", d / "study.json")
            self.assertEqual(sum(r["running"] for r in st["sessions"]), 3)
            self.assertFalse(st["all_done"])
        finally:
            for row in out["sessions"]:
                eyes("stop", "--session", row["session"])

    def test_live_site_opens_two_and_queues_the_rest(self):
        d = study("queue", allowed_hosts=["localhost", "www.example.com"])
        p = personas(d, [{"id": f"p{i}"} for i in range(3)])
        out = jrun("start", "--study", d / "study.json", "--personas", p, "--all")
        try:
            self.assertEqual(len(out["sessions"]), 2)
            self.assertEqual(out["queued"], ["p2"])
        finally:
            for row in out["sessions"]:
                eyes("stop", "--session", row["session"])

    def test_no_goal_page_means_goal_claims_are_unverified(self):
        d = study("nogoal", goal_match=None)
        p = personas(d, [{"id": "a"}])
        s = jrun("start", "--study", d / "study.json", "--personas", p, "--persona", "a")["session"]
        try:
            jrun("look", "--session", s)
            jrun("act", "--session", s, payload={"decision": DEC, "action": {"type": "finish", "outcome": "reached_goal", "reason": "r"}})
            j = json.loads((Path(s) / "journey.json").read_text(encoding="utf-8"))
            self.assertEqual(j["outcome"], "claimed_goal_unverified")
        finally:
            eyes("stop", "--session", s)

    def test_sessions_share_no_cookies_or_storage(self):
        """A site that remembers visitors must see every session, a re-walk included, as someone new."""
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            pg = b.new_page(viewport={"width": 1280, "height": 800})
            pg.goto(BASE + "/offers")
            bb = pg.get_by_text("Log in", exact=True).bounding_box()
            b.close()
        login = {"type": "click", "x": round(bb["x"] + bb["width"] / 2), "y": round(bb["y"] + bb["height"] / 2)}

        def visits():
            return json.loads(urllib.request.urlopen(BASE + "/_visits", timeout=5).read())

        d = study("isolation")
        p = personas(d, [{"id": "a"}, {"id": "b"}])
        started = []
        try:
            seen = len(visits())
            started.append(jrun("start", "--study", d / "study.json", "--personas", p, "--persona", "a")["session"])
            jrun("act", "--session", started[0], payload={"decision": DEC, "action": login})
            time.sleep(1)
            a = visits()[seen:]
            # The markers work inside one session: the second page carries the cookie and finds the stored value.
            self.assertIsNone(a[0]["visitor"])
            self.assertTrue(any(v["path"] == "/login" and v["visitor"] for v in a))
            self.assertTrue(any(v["path"] == "/_storage-seen" for v in a))
            a_visitor = next(v["visitor"] for v in a if v["visitor"])
            # While a's browser is still open, b and a re-walk of a each arrive with nothing.
            for pid in ("b", "a"):
                seen = len(visits())
                started.append(jrun("start", "--study", d / "study.json", "--personas", p, "--persona", pid)["session"])
                jrun("act", "--session", started[-1], payload={"decision": DEC, "action": login})
                time.sleep(1)
                new = visits()[seen:]
                self.assertIsNone(new[0]["visitor"], f"{pid} arrived with a cookie")
                self.assertNotIn(a_visitor, {v["visitor"] for v in new})
                # Its own second page may find what its first page stored; its first page must find nothing.
                first_page = new[:next(i for i, v in enumerate(new) if v["path"] == "/login")]
                self.assertFalse(any(v["path"] == "/_storage-seen" for v in first_page), f"{pid} found another session's storage")
            self.assertTrue(started[-1].endswith("a-2"))
        finally:
            for s in started:
                eyes("stop", "--session", s)

    def test_recon_has_no_brief(self):
        d = study("recon")
        s = jrun("start", "--study", d / "study.json", "--recon")
        try:
            self.assertNotIn("walker_prompt", s)
            self.assertNotEqual(eyes("brief", "--session", s["session"])[0], 0)
        finally:
            eyes("stop", "--session", s["session"])


class WalkAndReport(unittest.TestCase):
    """Two scripted walks on the moving offers page, then the whole report pipeline."""

    @classmethod
    def setUpClass(cls):
        cls.d = d = study("walks")
        p = personas(d, [{"id": "desk"}, {"id": "phone", "device": "mobile", "cpu": "slow"}])
        xy = dead_button_xy()
        cls.results = {}
        cls.prompts = {}
        finish = {"type": "finish", "outcome": "gave_up", "reason": "r"}
        for pid in ("desk", "phone"):
            started = jrun("start", "--study", d / "study.json", "--personas", p, "--persona", pid)
            s = started["session"]
            cls.prompts[pid] = started["walker_prompt"]
            # No look: start already took the first screen.
            acts = [{"type": "click", "x": 1180, "y": 700}, {"type": "click", **xy}] if pid == "desk" else [{"type": "scroll", "direction": "down"}]
            cls.results[pid] = [jrun("act", "--session", s, payload={"decision": DEC, "action": a}) for a in acts]
            if pid == "desk":
                cls.fill = jrun("act", "--session", s, payload={"decision": DEC, "action": {"type": "fill", "fields": [{"x": 1180, "y": 700}]}})
                cls.bad_fill = jrun("act", "--session", s, payload={"decision": DEC, "action": {"type": "fill", "fields": []}})
                cls.bad_interview = eyes("act", "--session", s, payload={"decision": DEC, "action": finish, "exit_interview": FEEDBACK})
                cls.status_before = jrun("status", "--study", d / "study.json")
                cls.finished = jrun("act", "--session", s, payload={"decision": DEC, "action": finish})
                cls.no_reasons = eyes("feedback", "--session", s, payload={k: v for k, v in FEEDBACK.items() if k != "reasons"})
                cls.saved = jrun("feedback", "--session", s, payload=FEEDBACK)
            else:
                jrun("act", "--session", s, payload={"decision": DEC, "action": finish})
                jrun("feedback", "--session", s, payload=FEEDBACK)

    def test_first_screen_comes_with_start(self):
        shot = re.search(r'first screen "([^"]+)"', self.prompts["desk"]).group(1)
        self.assertTrue(Path(shot).exists() and shot.endswith("step-001-grid.png"), shot)
        self.assertIn("brief.md", self.prompts["desk"])

    def test_exit_interview_after_recap(self):
        rc, out = self.bad_interview
        self.assertNotEqual(rc, 0)
        self.assertIn("Nothing was done", out)
        self.assertEqual(self.status_before["waiting_on"], ["desk"])   # an interview sent with the finish did not end the walk
        recap = self.finished["walk_recap"]
        self.assertTrue(self.finished["ended"])
        self.assertEqual(recap["steps_taken"], 5)
        self.assertIn("hardest_moments", recap)
        rc, out = self.no_reasons
        self.assertNotEqual(rc, 0)
        self.assertIn("reasons needs a sentence", out)
        self.assertTrue(self.saved["saved"].endswith("feedback.json"))

    def test_fill_is_one_step(self):
        self.assertTrue(self.fill.get("ok"), self.fill)
        self.assertTrue(self.fill.get("on_blank_space") is None or self.fill.get("no_visible_response"))
        self.assertFalse(self.bad_fill.get("ok"))
        self.assertIn("fill needs fields", self.bad_fill["error"])

    def test_moving_page_and_blank_clicks(self):
        blank, dead = self.results["desk"]
        self.assertTrue(blank.get("no_visible_response") and blank.get("on_blank_space"), blank)
        self.assertTrue(dead.get("no_visible_response") and not dead.get("on_blank_space"), dead)
        self.assertTrue(dead.get("screen_moves_by_itself"), "the rotating banner should be detected")
        self.assertIn("screenshot", dead["next_screen"])

    def test_walkthrough_shows_full_address(self):
        """The replay shows each step's address as the address bar had it, query and anchor included;
        the page scores and findings keep grouping by the trimmed page."""
        d = TMP / "full-address"
        shutil.copytree(self.d, d)
        full = BASE + "/offers?ref=mail&id=7#terms"
        j = next(d.glob("sessions/desk*/journey.json"))
        walk = json.loads(j.read_text(encoding="utf-8"))
        for st in walk["steps"]:
            st["address_bar"] = full
        j.write_text(json.dumps(walk), encoding="utf-8")
        for cmd in ("analyze", "render"):
            rc, out = report(cmd, "--study-dir", d)
            self.assertEqual(rc, 0, out)
        pages = {p["page"] for p in json.loads((d / "flows.json").read_text(encoding="utf-8"))["pages"]}
        self.assertIn("/offers?ref=mail&id=7", pages)
        nav = json.loads((d / "navigation.json").read_text(encoding="utf-8"))
        self.assertEqual(nav[j.parent.name]["steps"][0]["url"], full)
        html = (d / "report.html").read_text(encoding="utf-8")
        walks = json.loads(re.search(r"id='walks'[^>]*>(.*?)</script>", html, re.S).group(1))
        self.assertEqual(walks[j.parent.name]["frames"][0]["url"], full)

    def test_local_pace(self):
        self.assertLess(self.results["phone"][0]["ms"], 1500)

    def test_status(self):
        self.assertEqual(self.status_before["waiting_on"], ["desk"])
        st = jrun("status", "--study", self.d / "study.json")
        self.assertTrue(st["all_done"], st)

    def test_report_pipeline(self):
        d = self.d
        rc, out = report("analyze", "--study-dir", d)
        self.assertEqual(rc, 0, out)
        page = next(p for p in json.loads((d / "flows.json").read_text(encoding="utf-8"))["pages"] if p["page"] == "/offers")
        self.assertEqual(page["score_parts"]["dead_clicks"], 1)
        self.assertEqual(page["missed_clicks"], 1)
        self.assertTrue((d / "hot_steps.json").exists())

        def f(fid, ev, **kw):
            return {"id": fid, "title": f"finding {fid}", "category": "contradiction", "severity": "high", "page": "/offers",
                    "personas": [], "description": "d", "conflict": ["a", "b"], "recommendation": "r", "evidence": ev, **kw}
        one = lambda step, box: {"session": "desk", "step": step, "box": box}
        findings = [
            f("F1", [one(2, [10, 10, 100, 40])], category="button", personas=["desk"]),
            f("F2", [one(1, [10, 10, 100, 40]), one(1, [10, 300, 100, 40])]),   # one screen, two places: kept
            f("F3", [one(1, [10, 10, 100, 40]), one(1, [20, 15, 100, 40])]),    # same place twice: removed
            f("F4", [one(9, [10, 10, 100, 40])], category="button"),            # no such step: removed
        ]
        (d / "findings.json").write_text(json.dumps(findings), encoding="utf-8")
        (d / "insights.json").write_text(json.dumps({"research_questions": [], "simulation_notes": []}), encoding="utf-8")
        rc, out = report("verify", "--study-dir", d)
        self.assertEqual(rc, 0, out)
        v = json.loads((d / "verified_findings.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(x["id"] for x in v["kept"]), ["F1", "F2"])
        f1 = next(x for x in v["kept"] if x["id"] == "F1")
        self.assertEqual((f1["exposure"]["walks_reached"], f1["exposure"]["walks_hit"]), (2, 1))
        self.assertEqual({r["persona"] for r in v["rewalk"]}, {"desk"})
        for cmd in ("render", "export"):
            rc, out = report(cmd, "--study-dir", d)
            self.assertEqual(rc, 0, out)
        self.assertIn("walks that reached the page", (d / "issues" / "F1.md").read_text(encoding="utf-8"))
        html = (d / "report.html").read_text(encoding="utf-8")
        self.assertIn("finding F1", html)

        # The same panel on "another site": a copy of this study in which nobody hit F2, with F1 found on a
        # different page of the same stage under a different wording.
        other = TMP / "other-site"
        shutil.copytree(d, other)
        v2 = json.loads((other / "verified_findings.json").read_text(encoding="utf-8"))
        v2["kept"] = [dict(x, page="/offers", title="Claim button ignores presses") for x in v2["kept"] if x["id"] == "F1"]
        (other / "verified_findings.json").write_text(json.dumps(v2), encoding="utf-8")
        rc, out = report("compare", "--study-dir", d, "--baseline", other, "--versus")
        self.assertEqual(rc, 0, out)
        c = json.loads((d / "compare.json").read_text(encoding="utf-8"))
        status = {r["after"] or r["before"]: r["status"] for r in c["findings"]}
        self.assertEqual(status, {"F1": "on both sites", "F2": "only on walks"})
        self.assertIn("<h1>Side by side</h1>", (d / "compare.html").read_text(encoding="utf-8"))
        rc, out = report("compare", "--study-dir", d, "--baseline", other)
        self.assertEqual(rc, 0, out)
        self.assertEqual(json.loads(out)["new"], 1)


if __name__ == "__main__":
    unittest.main()
