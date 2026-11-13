#!/usr/bin/env python3
"""Vision-only browser driver for persona crawls.

  check     validate a study file
  start     open a persona's browser on the study's start page
  look      screenshot what is on screen, with a light coordinate grid (a clean copy is kept on disk)
  zoom      lean in: an enlarged crop of part of the last screenshot
  measure   eyedropper: the two main colours in a box, their contrast ratio, the box size
  act       record the persona's reaction, do one thing, and return the next screen (JSON on stdin)
  feedback  record the persona's exit interview once the session has ended (JSON on stdin)
  stop      shut a session down

The persona receives pixels and the address bar, the way a person does: never the
page's text, markup, accessibility names, link targets or form attributes. The driver
keeps to the same rule. It never evaluates script in the page or queries elements;
it clicks, types and scrolls by screen position. `zoom` and `measure` work on the
saved screenshot, not the page.

Safety limits are enforced here, at the network layer and on what gets typed,
because a prompt can be misread and these limits protect real sites and people.
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import secrets
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ANALYTICS_HOST = re.compile(
    r"(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|demdex\.net"
    r"|omtrdc\.net|facebook\.net|bat\.bing\.com|clarity\.ms|hotjar\.com|segment\.(io|com)|fullstory\.com"
    r"|quantummetric\.com|contentsquare\.net|mouseflow\.com|px\.ads\.linkedin\.com|googleadservices\.com)$"
)
TEST_LABELS = {"staging", "stage", "dev", "test", "qa", "sandbox", "preview", "uat"}
READ_ONLY_METHODS = {"GET", "HEAD", "OPTIONS"}
OUTCOMES = {
    "reached_goal", "reached_boundary", "gave_up", "left_site", "would_call_or_visit",
    "saved_for_later", "blocked_by_site",
}
DECISION_KEYS = ("thought", "read", "clarity", "trust", "effort", "doubts", "friction", "est_seconds")
# Worth writing only when something new happens on a screen; left out, they are recorded as empty.
OPTIONAL_DECISION_KEYS = ("noticed", "emotion", "memory")
FRICTION_TYPES = {
    "unclear_copy", "missing_information", "contradiction", "hidden_cost_or_condition", "surprise_requirement",
    "trust_concern", "navigation", "dead_end", "button_unclear", "button_hard_to_find", "low_contrast",
    "small_text", "small_target", "visual_hierarchy", "layout_or_overlap", "form_burden", "error_handling",
    "no_feedback", "performance", "accessibility",
}
SEVERITIES = {"critical", "high", "medium", "low"}
# Looks like real identity or payment data. Typed values must not, even on a test site.
REAL_LOOKING = re.compile(
    r"\b\d{3}-\d{2}-\d{4}\b|\b(?:\d[ -]?){13,19}\b|[A-Z0-9._%+-]+@(?!example\.(com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}",
    re.I,
)
MAX_EDGE = 1568  # longest screenshot side a vision model takes without resizing
FEEDBACK_SCALES = {"ease": (1, 7), "meets_needs": (1, 7), "easy_to_use": (1, 7), "recommend": (0, 10), "satisfaction": (1, 5)}
FEEDBACK_TEXT = ("one_word", "best_thing", "worst_thing", "what_would_fix_it", "would_return", "quote")


LONG_PREFIX = "\\\\?\\"


def lp(path) -> Path:
    """Windows refuses paths over 260 characters unless they carry the extended-length prefix.
    Every file this driver writes goes through such a path, so a deep project folder still works."""
    path = Path(path)
    if os.name != "nt" or str(path).startswith(LONG_PREFIX):
        return path
    return Path(LONG_PREFIX + os.path.abspath(str(path)))


def shown(path) -> str:
    """A path as people and tools expect to see it, without the extended-length prefix."""
    text = str(path)
    return text[len(LONG_PREFIX):] if text.startswith(LONG_PREFIX) else text


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "item"


def is_test_host(host: str) -> bool:
    host = host.lower().strip("[]")
    if host in ("localhost", "::1") or host.endswith((".localhost", ".test")) or host.startswith("127."):
        return True
    return any(part in TEST_LABELS for label in host.split(".")[:-1] for part in label.split("-"))


def load_study(path: Path) -> dict:
    study = json.loads(lp(path).read_text(encoding="utf-8"))
    problems = []
    for key in ("id", "product", "start_url", "allowed_hosts"):
        if not study.get(key):
            problems.append(f"missing {key}")
    # People write hosts the way they see them: "localhost:8765", "https://www.acme.com/". Every check here
    # compares bare host names, so a port or scheme would make a local system look like a live site (slow
    # pace, two sessions at a time) and its own start_url look off-site.
    hosts = []
    for h in study.get("allowed_hosts") or []:
        name = (urlsplit(h if "//" in h else "//" + h).hostname or "").lower()
        if name and name not in hosts:
            hosts.append(name)
    if study.get("allowed_hosts"):
        study["allowed_hosts"] = hosts
    study.setdefault("mode", "observe_only")
    if study["mode"] not in ("observe_only", "test_env"):
        problems.append("mode must be observe_only or test_env")
    start_host = (urlsplit(study.get("start_url", "")).hostname or "").lower()
    if start_host and start_host not in [h.lower() for h in study.get("allowed_hosts", [])]:
        problems.append(f"start_url host {start_host} is not in allowed_hosts")
    if study["mode"] == "test_env":
        if not study.get("environment_confirmation"):
            problems.append("test_env needs environment_confirmation: who confirmed these hosts are test systems")
        bad = [h for h in study.get("allowed_hosts", []) if not is_test_host(h)]
        if bad:
            problems.append(f"test_env refused, not test hosts: {bad}. Use observe_only for live sites.")
    study.setdefault("max_steps", 30)
    # Pacing protects real sites. A local or staging system needs only enough time for the screen to settle.
    all_test = all(is_test_host(h) for h in study.get("allowed_hosts", []))
    study["local_pace"] = all_test
    study.setdefault("pace_ms", 300 if all_test else 1200)
    study.setdefault("stages", [])
    if problems:
        raise SystemExit("Study invalid: " + "; ".join(problems))
    return study


def find_env() -> dict:
    here = Path(__file__).resolve()
    for base in [Path.cwd(), *Path.cwd().parents, *here.parents]:
        root = base / ".ux-visual-crawl"
        py = root / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        if py.exists():
            env = dict(os.environ)
            env["PLAYWRIGHT_BROWSERS_PATH"] = str(root / "browsers")
            env["PYTHONIOENCODING"] = "utf-8"
            return {"python": str(py), "env": env}
    raise SystemExit("No local environment. Run scripts/setup_env.py --project <project> first.")


# ---------------------------------------------------------------- pixels

def luminance(rgb) -> float:
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hexof(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(round(c)) for c in rgb)


def two_colours(img):
    """Background = the commonest colour; foreground = the most contrasting colour that covers a real share."""
    px = list(img.convert("RGB").getdata())
    buckets = Counter()
    sums = {}
    for r, g, b in px:
        key = (r >> 3, g >> 3, b >> 3)
        buckets[key] += 1
        s = sums.setdefault(key, [0, 0, 0])
        s[0] += r; s[1] += g; s[2] += b
    mean = {k: tuple(v / buckets[k] for v in sums[k]) for k in buckets}
    bg_key, _ = buckets.most_common(1)[0]
    bg = mean[bg_key]
    total = len(px)
    floor = max(4, total * 0.004)
    best, best_ratio = None, 1.0
    for key, n in buckets.most_common(60):
        if key == bg_key or n < floor:
            continue
        ratio = contrast(bg, mean[key])
        if ratio > best_ratio:
            best, best_ratio = mean[key], ratio
    return bg, best, best_ratio, (buckets[bg_key] / total)


# Machado, Oliveira & Fernandes (2009) at full severity, applied to sRGB values: a common approximation.
CVD = {
    "protanopia": (0.152286, 1.052583, -0.204868, 0, 0.114503, 0.786281, 0.099216, 0, -0.003882, -0.048116, 1.051998, 0),
    "deuteranopia": (0.367322, 0.860646, -0.227968, 0, 0.280085, 0.672501, 0.047413, 0, -0.011820, 0.042940, 0.968881, 0),
    "tritanopia": (1.255528, -0.076749, -0.178779, 0, -0.078411, 0.930809, 0.147602, 0, 0.004733, 0.691367, 0.303900, 0),
}
VISION = set(CVD) | {"blurred"}


def as_seen(img, vision, k: float = 1.0):
    """The screen as this persona sees it. Measurements still use the true pixels."""
    from PIL import ImageFilter

    img = img.convert("RGB")
    if vision in CVD:
        img = img.convert("RGB", CVD[vision])
    elif vision == "blurred":  # uncorrected low vision: soft edges, small text runs together
        img = img.filter(ImageFilter.GaussianBlur(radius=1.4 * k))
    return img


def draw_grid(src: Path, dst: Path, step: int = 100, vision=None, k: float = 1.0):
    from PIL import Image, ImageDraw

    img = as_seen(Image.open(src), vision, k)
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    w, h = img.size
    # Faint lines so the screen still reads as itself; solid labels on the top and left edges as rulers.
    for x in range(step, w, step):
        d.line([(x, 0), (x, h)], fill=(255, 0, 80, 45), width=1)
        d.rectangle([x + 2, 1, x + 30, 13], fill=(255, 0, 80, 200))
        d.text((x + 3, 1), str(x), fill=(255, 255, 255, 255))
    for y in range(step, h, step):
        d.line([(0, y), (w, y)], fill=(255, 0, 80, 45), width=1)
        d.rectangle([1, y + 2, 30, y + 14], fill=(255, 0, 80, 200))
        d.text((2, y + 2), str(y), fill=(255, 255, 255, 255))
    Image.alpha_composite(img.convert("RGBA"), over).convert("RGB").save(dst)


def _small(raw: bytes, scale: int = 4):
    import io
    from PIL import Image

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return img.resize((max(1, img.width // scale), max(1, img.height // scale)))


def _changed(a, b):
    """Pixels that changed clearly in any colour channel. Brightness alone misses a green that turns an equally
    bright purple, which people see at once."""
    from PIL import ImageChops

    r, g, bl = ImageChops.difference(a, b).split()
    return ImageChops.lighter(ImageChops.lighter(r, g), bl).point(lambda v: 255 if v > 12 else 0)


def restless_mask(looked: bytes, before: bytes):
    """Parts of the screen that changed while nobody touched it (carousels, clocks, video), widened a little."""
    from PIL import ImageFilter

    a, b = _small(looked), _small(before)
    if a.size != b.size:
        return None
    diff = _changed(a, b)
    if not diff.getbbox():
        return None
    return diff.filter(ImageFilter.MaxFilter(9))


def visible_change(before: bytes, after: bytes, ignore=None) -> bool:
    """Did the action change the screen, outside the parts that move by themselves?
    Counts pixels that changed clearly, on a quarter-size copy; a few stray pixels don't count."""
    from PIL import ImageChops

    a, b = _small(before), _small(after)
    if a.size != b.size:
        return True
    diff = _changed(a, b)
    if ignore is not None and ignore.size == diff.size:
        diff = ImageChops.subtract(diff, ignore)
    changed = diff.histogram()[255]
    return changed >= 6  # identical renders differ by nothing; a ticked checkbox is about 16 pixels here


def blank_at(raw: bytes, x: float, y: float, k: float = 1.0) -> bool:
    """True when the area around a click (about 12 CSS px each way) holds one flat colour: no text, edge or control."""
    import io
    from PIL import Image, ImageStat

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    r = max(6, round(12 * k))
    patch = img.crop((max(0, int(x) - r), max(0, int(y) - r), min(img.width, int(x) + r), min(img.height, int(y) + r)))
    if patch.width < 2 or patch.height < 2:
        return False
    lo_hi = patch.getextrema()
    return max(hi - lo for lo, hi in lo_hi) <= 12 and max(ImageStat.Stat(patch).stddev) < 2.5


def parse_box(text: str):
    parts = [int(float(p)) for p in re.split(r"[ ,]+", text.strip()) if p]
    if len(parts) != 4 or parts[2] <= 0 or parts[3] <= 0:
        raise SystemExit("--box must be x,y,width,height in screenshot pixels")
    return parts


# ---------------------------------------------------------------- session

class Session:
    def __init__(self, session_dir: Path):
        self.dir = session_dir
        meta = json.loads((session_dir / "session.json").read_text(encoding="utf-8"))
        self.meta = meta
        self.study = load_study(Path(meta["study_path"]))
        self.persona = meta["persona"]
        self.allowed = {h.lower() for h in self.study["allowed_hosts"]}
        self.observe_only = self.study["mode"] == "observe_only"
        self.step = 0
        self.looked = None
        self.motion = {}  # address -> mask of the parts of that page that move by themselves
        self.last_hash = None
        self.events = []
        self.dialogs = []
        self.no_change = 0
        self.ended = None
        self.boundary_hit = False
        self.visited = []
        self.est_total = 0.0
        self.counts = {"analytics_blocked": 0, "writes_blocked": 0, "off_site_refused": 0, "typing_refused": 0}
        self.done = asyncio.Event()
        self.last_seen = time.time()
        (self.dir / "shots").mkdir(exist_ok=True)
        self.journey = {
            "study": self.study["id"], "product": self.study["product"], "mode": self.study["mode"],
            "persona": {k: self.persona.get(k) for k in ("id", "name", "device", "browser_zoom")},
            "demographics": self.persona.get("demographics", {}), "task": self.persona.get("task"),
            "start_url": meta["start_url"], "started": time.strftime("%Y-%m-%dT%H:%M:%S"), "steps": [],
        }

    # browser
    async def boot(self):
        from playwright.async_api import async_playwright

        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=not self.meta.get("headed"))
        zoom = float(self.persona.get("browser_zoom", 100)) / 100
        if self.persona.get("device") == "mobile":
            opts = dict(self.pw.devices["Pixel 7"])
            opts.pop("default_browser_type", None)
            opts["device_scale_factor"] = 2 * zoom
            if zoom != 1:
                vw, vh = opts["viewport"]["width"], opts["viewport"]["height"]
                opts["viewport"] = {"width": round(vw / zoom), "height": round(vh / zoom)}
        else:
            opts = {"viewport": {"width": round(1280 / zoom), "height": round(800 / zoom)}, "device_scale_factor": zoom}
        # Vision models scale down images whose long edge passes MAX_EDGE, and a scaled image makes the walker's
        # click estimates land off target. Lowering the pixel density keeps the CSS layout (and so the zoom) intact.
        vp = opts["viewport"]
        cap = MAX_EDGE / max(vp["width"], vp["height"])
        if opts["device_scale_factor"] > cap:
            opts["device_scale_factor"] = round(cap - 0.005, 2)
        self.k = opts["device_scale_factor"]  # screenshot pixels per CSS pixel
        self.meta["image_scale"] = self.k
        (self.dir / "session.json").write_text(json.dumps(self.meta, indent=2, ensure_ascii=False), encoding="utf-8")
        self.mobile = self.persona.get("device") == "mobile"
        # How this person's own device is set up: the site may look different in dark mode or another language.
        if self.persona.get("color_scheme") in ("light", "dark"):
            opts["color_scheme"] = self.persona["color_scheme"]
        if self.persona.get("reduced_motion"):
            opts["reduced_motion"] = "reduce"
        if self.persona.get("locale"):
            opts["locale"] = str(self.persona["locale"])
        if self.persona.get("timezone"):
            opts["timezone_id"] = str(self.persona["timezone"])
        self.context = await self.browser.new_context(**opts)
        await self.context.route("**/*", self.on_route)
        self.context.on("page", self.on_new_page)
        self.page = await self.context.new_page()
        self.watch(self.page)
        await self.throttle(self.page)
        await self.page.goto(self.meta["start_url"], wait_until="domcontentloaded", timeout=30000)

    async def throttle(self, page):
        """A slow connection or an old, slow phone, applied to every tab this person opens."""
        slow_net, slow_cpu = self.persona.get("network") == "slow", self.persona.get("cpu") == "slow"
        if not (slow_net or slow_cpu):
            return
        try:
            cdp = await self.context.new_cdp_session(page)
            if slow_net:
                await cdp.send("Network.enable")
                await cdp.send("Network.emulateNetworkConditions",
                               {"offline": False, "latency": 400, "downloadThroughput": 200000, "uploadThroughput": 90000})
            if slow_cpu:
                # About a budget phone a few years old against a current laptop.
                await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        except Exception:
            pass

    def watch(self, page):
        async def on_dialog(dialog):
            # A native pop-up is on a person's screen even though no screenshot can show it.
            self.dialogs.append({"kind": dialog.type, "says": dialog.message[:400]})
            try:
                await dialog.dismiss()
            except Exception:
                pass
        page.on("dialog", lambda d: asyncio.ensure_future(on_dialog(d)))

    def on_new_page(self, page):
        self.page = page
        self.watch(page)
        asyncio.ensure_future(self.throttle(page))
        self.events.append({"kind": "new_tab"})

    async def refuse(self, route, navigation):
        # A 204 leaves the current page on screen instead of stranding the persona on a browser error page.
        if navigation:
            return await route.fulfill(status=204, body="")
        return await route.abort()

    async def on_route(self, route):
        req = route.request
        parts = urlsplit(req.url)
        if parts.scheme not in ("http", "https"):
            return await route.continue_()
        host = (parts.hostname or "").lower()
        navigation = req.resource_type == "document"
        if navigation:
            try:
                navigation = req.frame.parent_frame is None
            except Exception:
                navigation = True
        if ANALYTICS_HOST.search(host):
            self.counts["analytics_blocked"] += 1
            return await route.abort()
        if req.method not in READ_ONLY_METHODS:
            if self.observe_only or not (is_test_host(host) and host in self.allowed):
                self.counts["writes_blocked"] += 1
                self.boundary_hit = True
                self.events.append({"kind": "write_blocked", "host": host})
                return await self.refuse(route, navigation)
        if navigation and host not in self.allowed:
            self.counts["off_site_refused"] += 1
            self.events.append({"kind": "off_site", "host": host})
            return await self.refuse(route, True)
        await route.continue_()

    async def settle(self):
        try:
            await self.page.wait_for_load_state("domcontentloaded", timeout=9000)
            await self.page.wait_for_load_state("networkidle", timeout=1500 if self.study["local_pace"] else 3000)
        except Exception:
            pass
        await self.page.wait_for_timeout(self.study["pace_ms"])

    async def shot_bytes(self) -> bytes:
        return await self.page.screenshot(type="png", scale="device", animations="disabled", caret="initial")

    def to_css(self, v) -> float:
        return float(v) / self.k

    # commands
    async def look(self, raw: bytes = None) -> dict:
        """Screenshot the screen for the next step. `act` passes the shot it already took after settling,
        so the walker gets the next screen in the same call without a second wait."""
        if self.ended:
            return {"ended": self.ended}
        if raw is None:
            await self.settle()
            raw = await self.shot_bytes()
        step = self.step + 1
        clean = self.dir / "shots" / f"step-{step:03d}.png"
        grid = self.dir / "shots" / f"step-{step:03d}-grid.png"
        clean.write_bytes(raw)
        draw_grid(clean, grid, vision=self.persona.get("vision"), k=self.k)
        digest = hashlib.sha1(raw).hexdigest()
        from PIL import Image
        size = Image.open(clean).size
        url = self.page.url
        if url not in self.motion and not self.meta.get("recon"):
            # First look at this page: watch it for a moment untouched. Whatever changes on its own (a carousel,
            # a ticker, a video) is left out later when judging whether an action did anything.
            await self.page.wait_for_timeout(1600)
            try:
                self.motion[url] = restless_mask(raw, await self.shot_bytes())
            except Exception:
                self.motion[url] = None
        if not self.visited or self.visited[-1] != url:
            self.visited.append(url)
        self.looked = {"step": step, "url": url, "hash": digest, "size": size, "shot": str(clean), "raw": raw}
        # One image per step: the walker sees the screen with a light ruler grid, which serves both for
        # reading and for picking positions. The clean copy stays on disk for zoom, measure and evidence.
        view = {
            "step": step, "steps_left": self.study["max_steps"] - self.step, "address_bar": url,
            "tabs_open": len(self.context.pages), "screenshot": shown(grid), "image_size": list(size),
        }
        if self.last_hash == digest:
            view["note"] = "The screen looks exactly as it did at your last look."
        if self.dialogs:
            view["browser_popup"] = self.dialogs.pop(0)
            view["browser_popup"]["note"] = "A browser pop-up appeared with this message. It was closed with Cancel."
        self.last_hash = digest
        return view

    def guard_type(self, action: dict):
        text = str(action.get("text", ""))
        if self.observe_only:
            if action.get("purpose") != "search" or re.search(r"[\d@]", text) or len(text) > 80:
                return "typing_disabled_live_site"
            return None
        if text.startswith("test:"):
            return None
        if REAL_LOOKING.search(text):
            return "use_test_value"
        return None

    async def act(self, payload: dict) -> dict:
        from PIL import ImageChops

        if self.ended:
            return {"ok": False, "ended": self.ended}
        if not self.looked or self.looked["step"] != self.step + 1:
            return {"ok": False, "error": "Run look first. Every action must follow a fresh look."}
        decision, action = payload.get("decision") or {}, payload.get("action") or {}
        if self.meta.get("recon"):
            # The study author is surveying the site for facts.md, not role-playing, so no reaction is required.
            decision = {"thought": "", "noticed": "", "read": [], "clarity": 3, "trust": 3, "effort": 1, "emotion": "",
                        "doubts": [], "friction": [], "est_seconds": 0, "memory": "", **decision}
        decision = {**{k: "" for k in OPTIONAL_DECISION_KEYS}, **decision}
        missing = [k for k in DECISION_KEYS if k not in decision]
        if missing or "type" not in action:
            return {"ok": False, "error": f"Missing decision fields {missing} or action.type"}
        for key in ("clarity", "trust", "effort"):
            if not isinstance(decision[key], (int, float)) or not 1 <= decision[key] <= 5:
                return {"ok": False, "error": f"{key} must be a number from 1 to 5"}
        if not isinstance(decision["read"], list):
            return {"ok": False, "error": "read must be a list of the words you read on screen, copied as shown"}
        for f in decision["friction"]:
            if f.get("type") not in FRICTION_TYPES or f.get("severity") not in SEVERITIES:
                return {"ok": False, "error": f"friction needs type in {sorted(FRICTION_TYPES)} and severity in {sorted(SEVERITIES)}"}

        self.events.clear()
        url_before = self.page.url
        # A screen that moves by itself would make every click look like it did something.
        # Compare the screen the persona saw with one taken just now, and ignore whatever changed meanwhile.
        try:
            before_raw = await self.shot_bytes()
            restless = restless_mask(self.looked["raw"], before_raw)
            seen_moving = self.motion.get(self.looked["url"])
            if seen_moving is not None:
                restless = seen_moving if restless is None else ImageChops.lighter(restless, seen_moving)
            # On a desktop the pointer reaches the target before the click lands. Take the "before" picture
            # with it there, so a hover highlight alone isn't counted as the click doing something.
            if action.get("type") in ("click", "double_click") and not self.mobile and "x" in action and "y" in action:
                w, h = self.looked["size"]
                if 0 <= action["x"] < w and 0 <= action["y"] < h:
                    await self.page.mouse.move(self.to_css(action["x"]), self.to_css(action["y"]), steps=4)
                    await self.page.wait_for_timeout(150)
                    before_raw = await self.shot_bytes()
        except Exception:
            before_raw, restless = self.looked["raw"], None
        started = time.perf_counter()
        result = await self.perform(action)
        result["ms"] = round((time.perf_counter() - started) * 1000)
        self.step += 1
        self.est_total += float(decision.get("est_seconds") or 0)

        after_raw = None
        if not self.ended:
            try:
                after_raw = await self.shot_bytes()
            except Exception:
                after_raw = None
        if not self.ended and action["type"] not in ("finish", "wait"):
            result["screen_changed"] = visible_change(before_raw, after_raw, restless) if after_raw else True
            if restless is not None:
                result["screen_moves_by_itself"] = True
            result["address_changed"] = self.page.url != url_before
            result["address_after"] = self.page.url
            expects_change = action["type"] in ("click", "double_click", "key", "back", "scroll", "type")
            if expects_change and result.get("ok") and not result["screen_changed"]:
                result["no_visible_response"] = True
                if action["type"] in ("click", "double_click") and "x" in action and blank_at(self.looked["raw"], action["x"], action["y"], self.k):
                    # Nothing drawn under the pointer: a missed click, not a control that ignored the person.
                    result["on_blank_space"] = True
            self.no_change = self.no_change + 1 if result.get("no_visible_response") else 0
        result["events"] = list(self.events)

        logged = dict(action)
        if result.get("blocked") in ("typing_disabled_live_site", "use_test_value"):
            logged["text"] = "[refused, not recorded]"
        self.journey["steps"].append({
            "step": self.step, "at": time.strftime("%H:%M:%S"), "address_bar": self.looked["url"],
            "screenshot": Path(self.looked["shot"]).name, "image_size": self.looked["size"],
            "decision": decision, "action": logged, "result": result,
        })
        if self.ended:
            self.journey["steps_taken"] = self.step
        self.save()

        if self.step >= self.study["max_steps"] and not self.ended:
            await self.finish("step_cap", "Step limit reached", auto=True)
            result["ended"] = self.ended
        elif self.no_change >= 5 and not self.ended:
            await self.finish("harness_stall", "Five actions in a row produced no visible change", auto=True)
            result["ended"] = self.ended
        elif self.no_change >= 3:
            result["stall_warning"] = "Your last few actions changed nothing on screen. Try something else, or give up if that is what this person would do."
        if not self.ended:
            try:
                result["next_screen"] = await self.look(raw=after_raw)
            except Exception as exc:
                result["next_screen"] = {"error": f"Run look: {str(exc)[:200]}"}
        return result

    async def perform(self, action: dict) -> dict:
        kind = action["type"]
        page = self.page
        try:
            if kind == "finish":
                if action.get("outcome") not in OUTCOMES:
                    return {"ok": False, "error": f"outcome must be one of {sorted(OUTCOMES)}"}
                await self.finish(action["outcome"], action.get("reason", ""))
                return {"ok": True, "ended": self.ended,
                        "next": "Now record this person's exit interview with the feedback command."}
            if kind in ("click", "double_click", "hover"):
                if "x" not in action or "y" not in action:
                    return {"ok": False, "error": f"{kind} needs x and y in screenshot pixels"}
                w, h = self.looked["size"]
                if not (0 <= action["x"] < w and 0 <= action["y"] < h):
                    return {"ok": False, "error": f"x,y must be inside the {w}x{h} screenshot"}
                x, y = self.to_css(action["x"]), self.to_css(action["y"])
                if kind == "hover":
                    await page.mouse.move(x, y, steps=4)
                elif kind == "double_click":
                    await page.mouse.dblclick(x, y)
                elif self.mobile:
                    await page.touchscreen.tap(x, y)
                else:
                    await page.mouse.move(x, y, steps=4)
                    await page.mouse.click(x, y)
            elif kind == "type":
                refused = self.guard_type(action)
                if refused:
                    self.counts["typing_refused"] += 1
                    note = {
                        "typing_disabled_live_site": "Typing is off on a live site, apart from short search words. Say what this person would enter and how they feel about being asked, then go on or finish with reached_boundary.",
                        "use_test_value": "That looks like real identity or payment data. Type only test:<name> values from the list in your brief, or ordinary words.",
                    }[refused]
                    return {"ok": False, "blocked": refused, "note": note}
                text = str(action.get("text", ""))
                if text.startswith("test:"):
                    data = self.study.get("test_data") or {}
                    if text[5:] not in data:
                        return {"ok": False, "error": f"No test value named {text[5:]} in this study."}
                    text = str(data[text[5:]])
                await page.keyboard.type(text, delay=35)
                if action.get("enter"):
                    await page.keyboard.press("Enter")
            elif kind == "key":
                key = str(action.get("key", ""))
                allowed = {"Tab", "Shift+Tab", "Enter", "Escape", "Space", "Backspace", "ArrowDown", "ArrowUp",
                           "ArrowLeft", "ArrowRight", "PageDown", "PageUp", "Home", "End"}
                if key not in allowed:
                    return {"ok": False, "error": f"key must be one of {sorted(allowed)}"}
                await page.keyboard.press(key)
            elif kind == "scroll":
                amount = {"little": 0.3, "half": 0.5, "screen": 0.85}.get(action.get("amount", "screen"), 0.85)
                vp = page.viewport_size or {"width": 1280, "height": 800}
                sign = -1 if action.get("direction") == "up" else 1
                x = self.to_css(action["x"]) if "x" in action else vp["width"] / 2
                y = self.to_css(action["y"]) if "y" in action else vp["height"] / 2
                await page.mouse.move(x, y)
                await page.mouse.wheel(0, sign * vp["height"] * amount)
            elif kind == "back":
                await page.go_back(wait_until="domcontentloaded", timeout=15000)
            elif kind == "wait":
                await page.wait_for_timeout(3000)
            else:
                return {"ok": False, "error": f"Unknown action {kind}"}
        except Exception as exc:
            message = str(exc).splitlines()[0][:300]
            if "net::" not in message:
                return {"ok": False, "error": message}
        await self.settle()
        out = {"ok": True}
        off = next((e for e in self.events if e["kind"] == "off_site"), None)
        if off:
            out["blocked"] = "off_site"
            out["note"] = f"That leads off the site to {off['host']}, which this crawl does not visit. Go back to what you were doing, or finish with left_site if this person would leave."
        if any(e["kind"] == "write_blocked" for e in self.events):
            out["blocked"] = "write_blocked"
            out["note"] = "That would have sent information to the site, which is not allowed here. Say what you expected to happen next, then finish with reached_boundary."
        return out

    async def finish(self, outcome: str, reason: str, auto: bool = False):
        grounded = outcome
        goal = self.study.get("goal_match")
        # goal_match null means recon found no goal page at all, so no claim of reaching it can be checked.
        if outcome == "reached_goal" and "goal_match" in self.study and not (goal and any(re.search(goal, u, re.I) for u in self.visited)):
            grounded = "claimed_goal_unverified"
        if outcome == "reached_boundary" and not self.boundary_hit and not self.observe_only:
            grounded = "claimed_boundary_unverified"
        self.journey.update({
            "ended": time.strftime("%Y-%m-%dT%H:%M:%S"), "claimed_outcome": outcome, "outcome": grounded,
            "reason": reason, "auto_ended": auto, "steps_taken": self.step, "pages_visited": self.visited,
            "est_seconds": self.est_total, "counts": self.counts,
            "viewport_css": self.page.viewport_size, "image_scale": self.k,
        })
        self.save()
        self.ended = grounded

    def save(self):
        (self.dir / "journey.json").write_text(json.dumps(self.journey, indent=2, ensure_ascii=False), encoding="utf-8")

    async def close(self):
        for closer in (self.browser.close, self.pw.stop):
            try:
                await closer()
            except Exception:
                pass


async def daemon(session_dir: Path):
    session = Session(session_dir)
    token = secrets.token_hex(16)
    try:
        await session.boot()
    except Exception as exc:
        (session_dir / "daemon.json").write_text(json.dumps({"error": str(exc)[:800]}), encoding="utf-8")
        raise

    async def handle(reader, writer):
        try:
            request = json.loads(await reader.readline())
            session.last_seen = time.time()
            if request.get("token") != token:
                response = {"error": "bad token"}
            elif request["cmd"] == "look":
                response = await session.look()
            elif request["cmd"] == "act":
                response = await session.act(request["payload"])
            elif request["cmd"] == "stop":
                if not session.ended:
                    await session.finish("harness_stopped", "Stopped by operator", auto=True)
                response = {"ok": True}
                session.done.set()
            else:
                response = {"error": "unknown command"}
        except Exception as exc:
            response = {"error": f"{type(exc).__name__}: {str(exc)[:400]}"}
        writer.write((json.dumps(response, ensure_ascii=False) + "\n").encode("utf-8"))
        await writer.drain()
        writer.close()
        if session.ended and request.get("cmd") in ("act", "stop"):
            session.done.set()

    server = await asyncio.start_server(handle, "127.0.0.1", 0, limit=8 * 1024 * 1024)
    port = server.sockets[0].getsockname()[1]
    (session_dir / "daemon.json").write_text(json.dumps({"port": port, "token": token, "pid": os.getpid()}), encoding="utf-8")

    async def watchdog():
        while not session.done.is_set():
            await asyncio.sleep(10)
            if time.time() - session.last_seen > 1800:
                await session.finish("harness_stopped", "Idle timeout", auto=True)
                session.done.set()

    watcher = asyncio.create_task(watchdog())
    await session.done.wait()
    await asyncio.sleep(0.5)
    watcher.cancel()
    server.close()
    await session.close()


def call(session_dir: Path, cmd: str, payload=None) -> dict:
    import socket

    info_path = session_dir / "daemon.json"
    if not info_path.exists():
        raise SystemExit("No running session here. Was it started?")
    info = json.loads(info_path.read_text(encoding="utf-8"))
    if "error" in info:
        raise SystemExit("Browser failed to start: " + info["error"])
    try:
        with socket.create_connection(("127.0.0.1", info["port"]), timeout=120) as sock:
            sock.settimeout(120)
            sock.sendall((json.dumps({"token": info["token"], "cmd": cmd, "payload": payload}) + "\n").encode("utf-8"))
            chunks = []
            while True:
                data = sock.recv(1 << 16)
                if not data:
                    break
                chunks.append(data)
    except ConnectionRefusedError:
        journey = session_dir / "journey.json"
        ended = json.loads(journey.read_text(encoding="utf-8")).get("outcome") if journey.exists() else None
        return {"ended": ended or "session_closed"}
    return json.loads(b"".join(chunks).decode("utf-8"))


# ---------------------------------------------------------------- offline commands (saved screenshot only)

def last_shot(session_dir: Path, step=None) -> Path:
    shots = sorted(p for p in (session_dir / "shots").glob("step-[0-9][0-9][0-9].png"))
    if not shots:
        raise SystemExit("No screenshot yet. Run look first.")
    if step is None:
        return shots[-1]
    path = session_dir / "shots" / f"step-{int(step):03d}.png"
    if not path.exists():
        raise SystemExit(f"No screenshot for step {step}")
    return path


def cmd_zoom(args):
    from PIL import Image

    session_dir = lp(args.session)
    src = last_shot(session_dir, args.step)
    x, y, w, h = parse_box(args.box)
    meta = json.loads((session_dir / "session.json").read_text(encoding="utf-8"))
    # Leaning in enlarges what this person sees; it doesn't correct their colour vision or blur.
    img = as_seen(Image.open(src), meta["persona"].get("vision"), float(meta.get("image_scale", 1)))
    crop = img.crop((x, y, min(x + w, img.width), min(y + h, img.height)))
    factor = max(2, min(4, int(900 / max(crop.width, 1))))
    big = crop.resize((crop.width * factor, crop.height * factor), Image.LANCZOS)
    n = len(list((src.parent).glob(src.stem + "-zoom-*.png"))) + 1
    out = src.parent / f"{src.stem}-zoom-{n}.png"
    big.save(out)
    print(json.dumps({"zoomed": shown(out), "from": src.name, "box": [x, y, w, h], "enlarged": f"{factor}x"}))


def cmd_measure(args):
    from PIL import Image

    session_dir = lp(args.session)
    src = last_shot(session_dir, args.step)
    x, y, w, h = parse_box(args.box)
    img = Image.open(src).convert("RGB")
    crop = img.crop((x, y, min(x + w, img.width), min(y + h, img.height)))
    bg, fg, ratio, bg_share = two_colours(crop)
    meta = json.loads((session_dir / "session.json").read_text(encoding="utf-8"))
    persona = meta["persona"]
    k = float(meta.get("image_scale", 1))
    log = session_dir / "measurements.jsonl"
    n = sum(1 for _ in log.open(encoding="utf-8")) + 1 if log.exists() else 1
    rec = {
        "id": f"{slug(persona['id'])}:M{n}", "step": int(src.stem.split("-")[1]), "box": [x, y, w, h],
        "what": args.what or "", "background": hexof(bg), "foreground": hexof(fg) if fg else None,
        "contrast_ratio": round(ratio, 2) if fg else None, "background_share": round(bg_share, 2),
        "size_css_px": [round(w / k), round(h / k)],
    }
    if fg:
        rec["wcag"] = {"body_text_4_5": ratio >= 4.5, "large_text_3": ratio >= 3.0, "ui_component_3": ratio >= 3.0}
    else:
        rec["note"] = "Only one colour in that box. Draw the box tighter around the text or control and its background."
    rec["tap_target_24px"] = min(rec["size_css_px"]) >= 24
    with log.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec) + "\n")
    print(json.dumps(rec))


def feedback_problems(data) -> list:
    if not isinstance(data, dict):
        return ["the exit interview must be a JSON object"]
    problems = []
    for key, (lo, hi) in FEEDBACK_SCALES.items():
        v = data.get(key)
        if not isinstance(v, (int, float)) or not lo <= v <= hi:
            problems.append(f"{key} must be {lo} to {hi}")
    for key in FEEDBACK_TEXT:
        if not str(data.get(key, "")).strip():
            problems.append(f"{key} is required")
    return problems


def save_feedback(session_dir: Path, data: dict) -> Path:
    journey_path = session_dir / "journey.json"
    journey = json.loads(journey_path.read_text(encoding="utf-8")) if journey_path.exists() else {}
    if not journey.get("outcome"):
        raise SystemExit("The session has not ended. Finish it first, then give the exit interview.")
    data = dict(data, persona=journey["persona"]["id"], outcome=journey["outcome"])
    out = session_dir / "feedback.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


def cmd_feedback(args):
    data = read_payload(args)
    problems = feedback_problems(data)
    if problems:
        raise SystemExit("Feedback incomplete: " + "; ".join(problems))
    print(json.dumps({"ok": True, "saved": shown(save_feedback(lp(args.session), data))}))


def cmd_act(args):
    """One action. A finish may carry the exit interview, which saves the walker a separate call."""
    session_dir = lp(args.session)
    payload = read_payload(args)
    interview = payload.get("exit_interview") if isinstance(payload, dict) else None
    finishing = isinstance(payload, dict) and (payload.get("action") or {}).get("type") == "finish"
    if interview is not None:
        if not finishing:
            raise SystemExit("exit_interview goes only with a finish action.")
        problems = feedback_problems(interview)
        if problems:
            # Checked before the walk ends, so the walker can fix it and send the same finish again.
            raise SystemExit("Exit interview incomplete, nothing was done: " + "; ".join(problems))
    result = call(session_dir, "act", {k: v for k, v in payload.items() if k != "exit_interview"})
    if interview is not None and result.get("ok") and result.get("ended"):
        result["exit_interview"] = shown(save_feedback(session_dir, interview))
        result.pop("next", None)
    print(json.dumps(result, ensure_ascii=False))


# ---------------------------------------------------------------- start / main

def read_payload(args) -> dict:
    """JSON from --file if given, else stdin. A file lets each walker keep its own copy in its session folder."""
    text = lp(args.file).read_text(encoding="utf-8") if getattr(args, "file", None) else sys.stdin.read()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Not valid JSON: {exc}")


def lint_personas(people) -> tuple:
    """Problems that would break a walk (errors) and gaps that weaken the panel (warnings), before any walker starts."""
    errors, warnings = [], []
    if not isinstance(people, list) or not people:
        return ["personas.json must be a non-empty list"], []
    seen = set()
    for i, p in enumerate(people, 1):
        pid = str(p.get("id", ""))
        who = pid or f"persona {i}"
        if not pid:
            errors.append(f"{who}: missing id")
        elif len(pid) > 24:
            errors.append(f"{who}: id longer than 24 characters")
        elif slug(pid) in seen:
            errors.append(f"{who}: id repeats another persona's")
        seen.add(slug(pid))
        for key in ("name", "task"):
            if not p.get(key):
                errors.append(f"{who}: missing {key}")
        if p.get("device", "desktop") not in ("desktop", "mobile"):
            errors.append(f"{who}: device must be desktop or mobile")
        if p.get("browser_zoom", 100) not in (100, 150, 200):
            errors.append(f"{who}: browser_zoom must be 100, 150 or 200")
        if p.get("vision") and p["vision"] not in VISION:
            errors.append(f"{who}: vision must be one of {sorted(VISION)}")
        for key in ("network", "cpu"):
            if p.get(key) not in (None, "normal", "slow"):
                errors.append(f'{who}: {key} must be "normal" or "slow"')
        for t, v in (p.get("traits") or {}).items():
            if t != "reading" and not (isinstance(v, (int, float)) and 1 <= v <= 5):
                errors.append(f"{who}: trait {t} must be 1 to 5")
        if not p.get("gives_up_when"):
            warnings.append(f"{who}: no gives_up_when, so this person will persist far longer than a real one")
        if not p.get("demographics"):
            warnings.append(f"{who}: no demographics block")
        if not p.get("lacks"):
            warnings.append(f"{who}: lacks is empty; someone holding everything rarely shows where requirements are unclear")
    mobile = sum(p.get("device") == "mobile" for p in people)
    if mobile * 3 < len(people):
        warnings.append(f"only {mobile} of {len(people)} on a phone; aim for at least a third")
    if not any(p.get("browser_zoom", 100) > 100 or p.get("vision") for p in people):
        warnings.append("nobody browses at larger zoom or with a vision setting")
    return errors, warnings


def report_command() -> str:
    """The exact command that runs report.py: it needs the venv's Python, which is easy to get wrong."""
    try:
        py = find_env()["python"]
    except SystemExit:
        py = "python"
    return f'"{py}" "{Path(__file__).resolve().parent / "report.py"}"'


LIVE_TYPING = ("This is a live site. You may type only short search words, with `\"purpose\":\"search\"`. "
               "For any form, say what you would enter and how you feel about being asked, then decide whether to go on.")


def cmd_brief(args):
    """Print the walker brief from references/walker.md with this session's values filled in."""
    print(build_brief(lp(args.session)))


def build_brief(session_dir: Path) -> str:
    meta = json.loads((session_dir / "session.json").read_text(encoding="utf-8"))
    if meta.get("recon"):
        raise SystemExit("A recon session has no walker brief.")
    study = load_study(Path(meta["study_path"]))
    persona = meta["persona"]
    text = (Path(__file__).resolve().parent.parent / "references" / "walker.md").read_text(encoding="utf-8")
    text = text.split("\n---\n", 1)[1].lstrip("\n")
    if study["mode"] == "test_env":
        names = ", ".join(f"`test:{k}`" for k in study.get("test_data", {})) or "(none given)"
        typing = ("This is a test system. For anything personal type only these test values, written exactly as "
                  f"`test:<name>`: {names}. Anything else, type plain fake words.")
    else:
        typing = LIVE_TYPING
    text = re.sub(r"\[TYPING RULE:[^\n]*\]", lambda _: typing, text)
    text = (text.replace("[PASTE THE PERSONA JSON]", "```json\n" + json.dumps(persona, indent=2, ensure_ascii=False) + "\n```")
                .replace("[THE PERSONA'S TASK]", str(persona.get("task", "")))
                .replace("[DRIVER]", str(Path(__file__).resolve()))
                .replace("[SESSION]", shown(session_dir)))
    left = re.findall(r"\[[A-Z][A-Z' ]+\]", text)
    if left:
        raise SystemExit(f"walker.md has placeholders this command doesn't fill: {sorted(set(left))}")
    return text


def cmd_check(args):
    path = Path(args.study).resolve()
    study = load_study(path)
    out = {"ok": True, "id": study["id"], "mode": study["mode"], "hosts": study["allowed_hosts"],
           "treated_as": "test system" if study["local_pace"] else f"live site (at most {MAX_LIVE_SESSIONS} sessions at a time)",
           "pace_ms": study["pace_ms"],
           "report_command": report_command()}
    if args.personas:
        people = json.loads(lp(args.personas).read_text(encoding="utf-8"))
        people = people["personas"] if isinstance(people, dict) else people
        errors, warnings = lint_personas(people)
        out.update({"personas": len(people) if isinstance(people, list) else 0, "ok": not errors})
        if errors:
            out["errors"] = errors
        if warnings:
            out["warnings"] = warnings
    print(json.dumps(out, ensure_ascii=False, indent=1))
    if not out["ok"]:
        raise SystemExit(1)


MAX_LIVE_SESSIONS = 2  # at once, on a study whose hosts include a live site


def running_sessions(study_dir: Path) -> list:
    """Sessions of this study whose browser is still up: an unfinished journey and a daemon that answers."""
    import socket

    alive = []
    for info_path in list(study_dir.glob("sessions/*/daemon.json")) + list(study_dir.glob("recon/*/daemon.json")):
        journey = info_path.parent / "journey.json"
        try:
            if journey.exists() and json.loads(journey.read_text(encoding="utf-8")).get("outcome"):
                continue
            port = json.loads(info_path.read_text(encoding="utf-8")).get("port")
            if port:
                with socket.create_connection(("127.0.0.1", port), timeout=1):
                    alive.append(info_path.parent.name)
        except (OSError, ValueError):
            continue
    return alive


def cmd_status(args):
    """One line per persona session: how far it got, how it ended, whether the exit interview is in."""
    study_path = Path(args.study).resolve()
    study_dir = lp(study_path.parent)
    alive = set(running_sessions(study_dir))
    rows = []
    for d in sorted((study_dir / "sessions").glob("*/")) if (study_dir / "sessions").exists() else []:
        try:
            j = json.loads((d / "journey.json").read_text(encoding="utf-8")) if (d / "journey.json").exists() else {}
        except ValueError:
            j = {}
        steps = j.get("steps", [])
        rows.append({"session": d.name, "steps": len(steps), "outcome": j.get("outcome"),
                     "feedback": (d / "feedback.json").exists(), "running": d.name in alive,
                     "from": steps[0]["at"] if steps else None, "to": steps[-1]["at"] if steps else None})
    blocked = [r["session"] for r in rows if r["outcome"] == "blocked_by_site"]
    out = {"sessions": rows,
           "all_done": bool(rows) and all(r["outcome"] and r["feedback"] for r in rows),
           "waiting_on": [r["session"] for r in rows if not (r["outcome"] and r["feedback"])]}
    if len(blocked) >= 2:
        out["stop"] = f"{len(blocked)} sessions were stopped by the site ({', '.join(blocked)}): tell the user before running more."
    print(json.dumps(out, ensure_ascii=False, indent=1))


RECON_PERSONA = {"id": "recon", "name": "Study author (recon)", "device": "desktop"}


def cmd_start(args):
    study_path = Path(args.study).resolve()
    study = load_study(study_path)
    if args.recon:
        chosen = [dict(RECON_PERSONA, device=args.device or "desktop")]
        base = lp(study_path.parent) / "recon"
    else:
        if not args.personas or not (args.persona or args.all):
            raise SystemExit("start needs --personas with --persona <id[,id...]> or --all, or --recon")
        people = json.loads(lp(args.personas).read_text(encoding="utf-8"))
        people = people["personas"] if isinstance(people, dict) else people
        if args.all:
            chosen = list(people)
        else:
            ids = [x.strip() for x in args.persona.split(",") if x.strip()]
            missing = [i for i in ids if not any(p["id"] == i for p in people)]
            if missing:
                raise SystemExit(f"Persona {', '.join(missing)} not found")
            chosen = [next(p for p in people if p["id"] == i) for i in ids]
        base = lp(study_path.parent) / "sessions"
    for persona in chosen:
        if persona.get("vision") and persona["vision"] not in VISION:
            raise SystemExit(f"{persona['id']}: vision must be one of {sorted(VISION)}")
        start_url = persona.get("start_url") or study["start_url"]
        if (urlsplit(start_url).hostname or "").lower() not in {h.lower() for h in study["allowed_hosts"]}:
            raise SystemExit(f"{persona['id']}: the start_url is not on an allowed host")
    queued = []
    if not study["local_pace"]:
        busy = running_sessions(lp(study_path.parent))
        room = MAX_LIVE_SESSIONS - len(busy)
        if room <= 0:
            raise SystemExit(f"{len(busy)} sessions are already open on this live site ({', '.join(busy)}). "
                             f"Live runs use at most {MAX_LIVE_SESSIONS} at a time: start this one when one of them finishes.")
        chosen, queued = chosen[:room], [p["id"] for p in chosen[room:]]

    # Each browser takes a few seconds to come up, so launch them all and then wait for all of them.
    base.mkdir(exist_ok=True)
    runtime = find_env()
    flags = (subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP) if os.name == "nt" else 0
    launched = []
    for persona in chosen:
        start_url = persona.get("start_url") or study["start_url"]
        name = slug(persona["id"])[:24].strip("-")
        session_dir, n = base / name, 1
        while session_dir.exists():
            n += 1
            session_dir = base / f"{name}-{n}"
        session_dir.mkdir()
        meta = {"study_path": str(study_path), "persona": persona, "start_url": start_url, "headed": args.headed,
                "recon": bool(args.recon)}
        (session_dir / "session.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        log = open(session_dir / "daemon.log", "ab")
        subprocess.Popen(
            [runtime["python"], str(Path(__file__).resolve()), "_daemon", "--session", str(session_dir)],
            stdout=log, stderr=log, stdin=subprocess.DEVNULL, env=runtime["env"], creationflags=flags,
            start_new_session=os.name != "nt", close_fds=True,
        )
        launched.append((session_dir, start_url))
    deadline = time.time() + 90
    while time.time() < deadline and not all((d / "daemon.json").exists() for d, _ in launched):
        time.sleep(0.25)

    results, failed = [], []
    for session_dir, start_url in launched:
        info_path = session_dir / "daemon.json"
        info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {"error": f"did not start, see {shown(session_dir / 'daemon.log')}"}
        if "error" in info:
            failed.append(f"{session_dir.name}: {info['error']}")
            continue
        row = {"session": shown(session_dir), "start_url": start_url, "mode": study["mode"]}
        if not args.recon:
            brief = session_dir / "brief.md"
            brief.write_text(build_brief(session_dir), encoding="utf-8")
        results.append(row)
    if not args.recon and results:
        # Take each walker's first screen now, all at once, so the walker can open its brief and its first
        # screenshot together instead of spending a turn on look. Every later screen comes with act.
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(len(results)) as pool:
            firsts = list(pool.map(lambda r: call(lp(r["session"]), "look"), results))
        for row, first in zip(results, firsts):
            brief = Path(row["session"]) / "brief.md"
            shot = first.get("screenshot")
            # The orchestrator passes this one line instead of the whole brief: fewer tokens to write, and
            # nothing of its own can slip into the walker's prompt.
            row["walker_prompt"] = (
                f'Open these two files with your file-reading tool, both at once: your brief "{shown(brief)}" and your '
                f'first screen "{shot}". Then follow the brief exactly; it is your whole brief.' if shot else
                f'Read the file "{shown(brief)}" with your file-reading tool and follow it exactly. It is your whole brief.')
    if failed and not results:
        raise SystemExit("Browser failed to start: " + "; ".join(failed))
    if len(results) == 1 and not failed and not queued and not args.all:
        print(json.dumps(results[0], ensure_ascii=False))
        return
    out = {"sessions": results}
    if failed:
        out["failed"] = failed
    if queued:
        out["queued"] = queued
        out["note"] = f"Live site: at most {MAX_LIVE_SESSIONS} at a time. Start the queued ones as sessions finish."
    print(json.dumps(out, ensure_ascii=False, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("check"); p.add_argument("--study", required=True); p.add_argument("--personas", help="also check this personas.json")
    p = sub.add_parser("start")
    p.add_argument("--study", required=True); p.add_argument("--personas")
    p.add_argument("--persona", help="a persona id, or several separated by commas")
    p.add_argument("--all", action="store_true", help="start every persona in the file")
    p.add_argument("--headed", action="store_true")
    p.add_argument("--recon", action="store_true", help="a screen-only session for the study author, kept out of the analysis")
    p.add_argument("--device", choices=["desktop", "mobile"], help="device for a --recon session")
    p = sub.add_parser("status", help="how each persona session of a study stands")
    p.add_argument("--study", required=True)
    p = sub.add_parser("brief", help="print the filled-in walker brief for a persona session")
    p.add_argument("--session", required=True)
    for name in ("look", "stop"):
        p = sub.add_parser(name); p.add_argument("--session", required=True)
    for name in ("act", "feedback"):
        p = sub.add_parser(name); p.add_argument("--session", required=True)
        p.add_argument("--file", help="read the JSON from this file instead of stdin; keep it inside your session folder")
    p = sub.add_parser("zoom")
    p.add_argument("--session", required=True); p.add_argument("--box", required=True); p.add_argument("--step")
    p = sub.add_parser("measure")
    p.add_argument("--session", required=True); p.add_argument("--box", required=True)
    p.add_argument("--step"); p.add_argument("--what", help="what is in the box, e.g. 'fee footnote text'")
    p = sub.add_parser("_daemon"); p.add_argument("--session", required=True)
    args = ap.parse_args()

    if args.cmd == "_daemon":
        asyncio.run(daemon(lp(args.session)))
        return
    if args.cmd == "check":
        return cmd_check(args)
    if args.cmd == "start":
        return cmd_start(args)
    if args.cmd == "brief":
        return cmd_brief(args)
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "zoom":
        return cmd_zoom(args)
    if args.cmd == "measure":
        return cmd_measure(args)
    if args.cmd == "feedback":
        return cmd_feedback(args)
    if args.cmd == "act":
        return cmd_act(args)
    session_dir = lp(args.session)
    payload = read_payload(args) if args.cmd == "act" else None
    # One line: a walker reads one of these every step, and indentation is tokens it pays for each time.
    print(json.dumps(call(session_dir, args.cmd, payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
