#!/usr/bin/env python3
"""Turn recorded persona crawls into flow analysis, verified findings and a report.

  analyze  --study-dir DIR   navigation.json, flows.json, demographics.json, feedback.json
  verify   --study-dir DIR   check findings.json against the recordings -> verified_findings.json
  render   --study-dir DIR   report.html and report.md
  export   --study-dir DIR   issues/F1.md ... (one ticket per verified finding) and findings.csv
  compare  --study-dir DIR --baseline OLD   before/after: compare.json and compare.html

Runs under the project's .ux-visual-crawl venv (Pillow is used for evidence crops).
Every number in the report is computed here from journey.json files, so it can be traced.
"""
import argparse
import base64
import html
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

import os

LONG_PREFIX = "\\\\?\\"


def lp(path) -> Path:
    """Extended-length form on Windows, so studies in deep folders still read and write."""
    path = Path(path)
    if os.name != "nt" or str(path).startswith(LONG_PREFIX):
        return path
    return Path(LONG_PREFIX + os.path.abspath(str(path)))


def shown(path) -> str:
    text = str(path)
    return text[len(LONG_PREFIX):] if text.startswith(LONG_PREFIX) else text

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SEV_ORDER = ["critical", "high", "medium", "low"]
SEV_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}
CLICKS = ("click", "double_click")
SIM_OUTCOMES = {"step_cap", "harness_stall", "harness_stopped"}
CATEGORIES = {"bottleneck", "friction", "contradiction", "ui", "ux", "button", "contrast", "accessibility",
              "copy", "trust", "performance"}


def load(path: Path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def page_of(url: str) -> str:
    p = urlsplit(url)
    return (p.path.rstrip("/") or "/") + (("?" + p.query) if p.query else "")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().lower()


def sessions(study_dir: Path) -> dict:
    out = {}
    for j in sorted((study_dir / "sessions").glob("*/journey.json")):
        out[j.parent.name] = {"dir": j.parent, "journey": load(j), "feedback": load(j.parent / "feedback.json"),
                              "measurements": [json.loads(l) for l in (j.parent / "measurements.jsonl").open(encoding="utf-8")]
                              if (j.parent / "measurements.jsonl").exists() else []}
    return out


PAGE_URLS = {}  # page path -> a full address seen for it, so stage patterns can name a host


def stage_of(study: dict, page: str):
    """A stage matches if its pattern fits the full address (host included) or the path alone."""
    targets = [PAGE_URLS.get(page, page), page]
    hit = None
    for stage in study.get("stages", []):
        if any(re.search(stage["match"], t, re.I) for t in targets):
            hit = stage["id"]
    return hit


# ---------------------------------------------------------------- analyze

def analyze(study_dir: Path) -> dict:
    study = load(study_dir / "study.json", {})
    people = load(study_dir / "personas.json", [])
    people = people["personas"] if isinstance(people, dict) else people
    data = sessions(study_dir)
    if not data:
        raise SystemExit("No sessions with journey.json under sessions/")

    navigation, page_stats = {}, defaultdict(lambda: defaultdict(float))
    page_personas = defaultdict(set)
    for name, s in data.items():
        j = s["journey"]
        steps = j.get("steps", [])
        path, seen, backtracks, dead = [], [], [], []
        for st in steps:
            page = page_of(st["address_bar"])
            PAGE_URLS.setdefault(page, st["address_bar"])
            d, a, r = st["decision"], st["action"], st["result"]
            if not path or path[-1]["page"] != page:
                if page in seen and path:
                    backtracks.append({"step": st["step"], "returned_to": page, "from": path[-1]["page"], "via": a["type"]})
                path.append({"page": page, "first_step": st["step"], "steps": 0})
                seen.append(page)
            path[-1]["steps"] += 1
            ps = page_stats[page]
            page_personas[page].add(name)
            ps["steps"] += 1
            ps["seconds"] += float(d.get("est_seconds") or 0)
            for k in ("clarity", "trust", "effort"):
                ps[k + "_sum"] += d[k]
            for f in d.get("friction", []):
                ps["friction"] += 1
                ps["friction_weight"] += SEV_WEIGHT.get(f.get("severity"), 1)
            if a["type"] in CLICKS and r.get("no_visible_response"):
                if r.get("on_blank_space"):  # nothing drawn there: a missed click, kept out of the score
                    ps["missed_clicks"] += 1
                else:
                    dead.append({"step": st["step"], "page": page, "x": a.get("x"), "y": a.get("y")})
                    ps["dead_clicks"] += 1
            if a["type"] == "back":
                ps["back_presses"] += 1
            if r.get("blocked"):
                ps["refused_by_driver"] += 1
        outcome = j.get("outcome", "unfinished")
        exit_page = path[-1]["page"] if path else None
        if exit_page and outcome != "reached_goal" and outcome not in SIM_OUTCOMES:
            page_stats[exit_page]["exits_short_of_goal"] += 1
        for b in backtracks:
            page_stats[b["from"]]["backtracked_from"] += 1
        stages = []
        for p in path:
            sid = stage_of(study, p["page"])
            if sid and sid not in stages:
                stages.append(sid)
        navigation[name] = {
            "persona": j["persona"], "device": j["persona"].get("device"), "outcome": outcome,
            "claimed_outcome": j.get("claimed_outcome"), "reason": j.get("reason"),
            "steps_taken": j.get("steps_taken", len(steps)), "est_seconds": j.get("est_seconds"),
            "path": path, "stages_reached": stages, "backtracks": backtracks, "dead_clicks": dead,
            "exit_page": exit_page,
            "steps": [{"step": st["step"], "page": page_of(st["address_bar"]), "url": st["address_bar"],
                       "screenshot": st["screenshot"],
                       "action": st["action"], "address_after": st["result"].get("address_after"),
                       "screen_changed": st["result"].get("screen_changed"), "blocked": st["result"].get("blocked"),
                       "clarity": st["decision"]["clarity"], "trust": st["decision"]["trust"],
                       "effort": st["decision"]["effort"], "emotion": st["decision"].get("emotion", "")} for st in steps],
        }

    pages = []
    for page, ps in page_stats.items():
        n = ps["steps"] or 1
        visitors = len(page_personas[page])
        parts = {
            "steps_per_visitor": round(ps["steps"] / max(visitors, 1), 1),
            "dead_clicks": int(ps["dead_clicks"]), "backtracked_from": int(ps["backtracked_from"]),
            "exits_short_of_goal": int(ps["exits_short_of_goal"]), "friction_weight": int(ps["friction_weight"]),
        }
        score = (parts["steps_per_visitor"] + 2 * parts["dead_clicks"] + 1.5 * parts["backtracked_from"]
                 + 3 * parts["exits_short_of_goal"] + parts["friction_weight"] / max(visitors, 1))
        pages.append({
            "page": page, "stage": stage_of(study, page), "visitors": visitors, "steps": int(ps["steps"]),
            "est_seconds": round(ps["seconds"]), "friction_reports": int(ps["friction"]),
            "back_presses": int(ps["back_presses"]), "missed_clicks": int(ps["missed_clicks"]), "refused_by_driver": int(ps["refused_by_driver"]),
            "avg_clarity": round(ps["clarity_sum"] / n, 1), "avg_trust": round(ps["trust_sum"] / n, 1),
            "avg_effort": round(ps["effort_sum"] / n, 1), "score_parts": parts, "bottleneck_score": round(score, 1),
        })
    pages.sort(key=lambda p: -p["bottleneck_score"])
    for i, p in enumerate(pages, 1):
        p["handle"] = f"B{i}"

    funnel = []
    for stage in study.get("stages", []):
        reached = [n for n, v in navigation.items() if stage["id"] in v["stages_reached"]]
        funnel.append({"stage": stage["id"], "label": stage.get("label", stage["id"]), "reached": len(reached),
                       "of": len(navigation), "personas": reached})

    flows = {"study": study.get("id"), "personas": len(navigation), "pages": pages, "funnel": funnel,
             "score_formula": "steps_per_visitor + 2*dead_clicks + 1.5*backtracked_from + 3*exits_short_of_goal + friction_weight/visitors (critical 4, high 3, medium 2, low 1)"}

    by_id = {p["id"]: p for p in people}
    demo_rows = []
    for name, v in navigation.items():
        p = by_id.get(v["persona"]["id"], {})
        demo_rows.append({"session": name, "persona": p.get("id"), "name": p.get("name"), "device": p.get("device"),
                          "demographics": p.get("demographics", {}), "outcome": v["outcome"]})
    fb_rows = [dict(s["feedback"], session=n) for n, s in data.items() if s["feedback"]]
    summary = {}
    if fb_rows:
        umux = [((f["meets_needs"] - 1) + (f["easy_to_use"] - 1)) / 12 * 100 for f in fb_rows]
        rec = [f["recommend"] for f in fb_rows]
        summary = {
            "responses": len(fb_rows), "of": len(navigation),
            "ease_avg_1_7": round(sum(f["ease"] for f in fb_rows) / len(fb_rows), 1),
            "umux_lite_avg_0_100": round(sum(umux) / len(umux)),
            "satisfaction_avg_1_5": round(sum(f["satisfaction"] for f in fb_rows) / len(fb_rows), 1),
            "recommend_counts": {"9-10": sum(r >= 9 for r in rec), "7-8": sum(7 <= r <= 8 for r in rec), "0-6": sum(r <= 6 for r in rec)},
            "missing": [n for n in navigation if not data[n]["feedback"]],
        }
    hot = hot_steps(data)
    sheets = {}
    for name, s in data.items():
        try:
            sheets[name] = contact_sheets(s["dir"], s["journey"].get("steps", []), {h["step"] for h in hot.get(name, [])})
        except Exception as exc:  # a missing screenshot must not stop the analysis
            sheets[name] = {"error": str(exc)[:200]}
    (study_dir / "hot_steps.json").write_text(json.dumps(
        {"how": "Steps worth opening at full size, and why. Each session's contact sheets show every step as a "
                "thumbnail, hot steps outlined in red; open the full screenshot only where you need detail.",
         "contact_sheets": sheets, "sessions": hot}, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "navigation.json").write_text(json.dumps(navigation, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "flows.json").write_text(json.dumps(flows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "demographics.json").write_text(json.dumps(demo_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "feedback.json").write_text(json.dumps({"summary": summary, "responses": fb_rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"sessions": len(navigation), "pages": len(pages),
                      "hot_steps": sum(len(v) for v in hot.values()),
                      "top_bottlenecks": [(p["handle"], p["page"], p["bottleneck_score"]) for p in pages[:3]],
                      "feedback_missing": summary.get("missing", list(navigation))}, ensure_ascii=False))
    return flows


def hot_steps(data: dict) -> dict:
    """The moments a reviewer should look at closely: where something went wrong for the persona."""
    out = {}
    for name, s in data.items():
        j = s["journey"]
        steps = j.get("steps", [])
        reasons = defaultdict(list)
        seen_pages = []
        for i, st in enumerate(steps):
            d, a, r = st["decision"], st["action"], st["result"]
            n = st["step"]
            page = page_of(st["address_bar"])
            if a["type"] in CLICKS and r.get("no_visible_response") and not r.get("on_blank_space"):
                reasons[n].append("dead click")
            if d["clarity"] <= 2:
                reasons[n].append(f"clarity {d['clarity']}")
            if d["trust"] <= 2:
                reasons[n].append(f"trust {d['trust']}")
            if d["effort"] >= 4:
                reasons[n].append(f"effort {d['effort']}")
            if i:
                prev = steps[i - 1]["decision"]
                for k in ("clarity", "trust"):
                    if prev[k] - d[k] >= 2:
                        reasons[n].append(f"{k} fell {prev[k]}->{d[k]}")
            sev = [f.get("type") for f in d.get("friction", []) if f.get("severity") in ("critical", "high")]
            if sev:
                reasons[n].append("high friction: " + ", ".join(sev))
            if any(f.get("type") == "contradiction" for f in d.get("friction", [])):
                reasons[n].append("reported contradiction")
            if a["type"] == "back" or (seen_pages and seen_pages[-1] != page and page in seen_pages):
                reasons[n].append("backtrack")
            if not seen_pages or seen_pages[-1] != page:
                seen_pages.append(page)
        if steps and j.get("outcome") != "reached_goal":
            for st in steps[-2:]:
                reasons[st["step"]].append(f"before exit ({j.get('outcome')})")
        by_step = {st["step"]: st for st in steps}
        out[name] = [{"step": n, "page": page_of(by_step[n]["address_bar"]), "screenshot": by_step[n]["screenshot"],
                      "why": sorted(set(w)), "thought": str(by_step[n]["decision"].get("thought", ""))[:220]}
                     for n, w in sorted(reasons.items()) if w]
    return out


def contact_sheets(session_dir: Path, steps: list, hot: set, per_sheet: int = 12) -> list:
    """Every step as a numbered thumbnail, a few sheets per session, so a reviewer sees a whole walk in one image."""
    from PIL import Image, ImageDraw, ImageFont

    box, cols, label = 300, 4, 22
    files = []
    for start in range(0, len(steps), per_sheet):
        chunk = steps[start:start + per_sheet]
        thumbs = []
        for st in chunk:
            src = session_dir / "shots" / st["screenshot"]
            if not src.exists():
                continue
            im = Image.open(src).convert("RGB")
            im.thumbnail((box, box))
            thumbs.append((st, im))
        if not thumbs:
            continue
        rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
        tops, y = [], 8
        for row in rows:
            tops.append(y)
            y += label + max(im.height for _, im in row) + 10
        sheet = Image.new("RGB", (cols * (box + 8) + 8, y), (245, 246, 248))
        d = ImageDraw.Draw(sheet)
        try:
            font = ImageFont.load_default(size=15)
        except TypeError:  # Pillow older than 10.1
            font = ImageFont.load_default()
        for i, (st, im) in enumerate(thumbs):
            x = 8 + (i % cols) * (box + 8)
            y = tops[i // cols]
            mark = st["step"] in hot
            d.text((x + 2, y + 2), f"step {st['step']}  {st['action']['type']}" + ("  *" if mark else ""),
                   fill=(200, 0, 50) if mark else (40, 40, 40), font=font)
            sheet.paste(im, (x, y + label))
            if mark:
                d.rectangle([x - 3, y + label - 3, x + im.width + 2, y + label + im.height + 2], outline=(220, 0, 60), width=3)
            a = st["action"]
            if a["type"] in CLICKS + ("hover",) and "x" in a:
                k = im.width / max(st["image_size"][0], 1)
                cx, cy = x + a["x"] * k, y + label + a["y"] * k
                d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline=(220, 0, 60), width=2)
        out = session_dir / f"contact-{start // per_sheet + 1}.jpg"
        sheet.save(out, quality=80)
        files.append(str(out.relative_to(session_dir.parent.parent)).replace("\\", "/"))
    return files


# ---------------------------------------------------------------- verify

def crop_evidence(src: Path, box, out: Path):
    from PIL import Image, ImageDraw

    img = Image.open(src).convert("RGB")
    x, y, w, h = box
    pad = 60
    l, t = max(0, x - pad), max(0, y - pad)
    r, b = min(img.width, x + w + pad), min(img.height, y + h + pad)
    c = img.crop((l, t, r, b))
    ImageDraw.Draw(c).rectangle([x - l, y - t, x - l + w, y - t + h], outline=(230, 0, 60), width=3)
    if c.width > 900:
        c = c.resize((900, round(c.height * 900 / c.width)))
    c.save(out, quality=85)


def slug_id(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")


def verify(study_dir: Path) -> int:
    data = sessions(study_dir)
    findings = load(study_dir / "findings.json")
    if findings is None:
        raise SystemExit("No findings.json in the study folder")
    flows = load(study_dir / "flows.json", {"pages": []})
    pages = {p["page"] for p in flows["pages"]}
    ev_dir = study_dir / "evidence"
    ev_dir.mkdir(exist_ok=True)
    kept, removed = [], []
    for f in findings:
        problems, notes = [], []
        if f.get("category") not in CATEGORIES:
            problems.append(f"category must be one of {sorted(CATEGORIES)}")
        if f.get("severity") not in SEV_ORDER:
            problems.append("severity must be critical, high, medium or low")
        evidence = f.get("evidence") or []
        if not evidence:
            problems.append("no evidence")
        for i, e in enumerate(evidence, 1):
            s = data.get(e.get("session"))
            if not s:
                problems.append(f"evidence {i}: no session {e.get('session')}")
                continue
            step = next((st for st in s["journey"]["steps"] if st["step"] == e.get("step")), None)
            if not step:
                problems.append(f"evidence {i}: no step {e.get('step')} in {e['session']}")
                continue
            shot = s["dir"] / "shots" / step["screenshot"]
            box = e.get("box")
            w, h = step["image_size"]
            if not (isinstance(box, list) and len(box) == 4 and box[0] >= 0 and box[1] >= 0 and box[2] > 0 and box[3] > 0
                    and box[0] + box[2] <= w + 2 and box[1] + box[3] <= h + 2):
                problems.append(f"evidence {i}: box must be [x,y,w,h] inside the {w}x{h} screenshot")
                continue
            if e.get("quote"):
                d = step["decision"]
                said = " | ".join([*map(str, d.get("read", [])), str(d.get("noticed", "")), str(d.get("thought", "")),
                                   *[str(x.get("quote", "")) for x in d.get("friction", [])]])
                e["quote_in_record"] = norm(e["quote"]) in norm(said)
                if not e["quote_in_record"]:
                    notes.append(f"evidence {i}: quote read from the screenshot by the reviewer, not in the persona's record")
            out = ev_dir / f"{f.get('id', 'F')}-{i}.jpg"
            crop_evidence(shot, box, out)
            e["crop"] = f"evidence/{out.name}"
        if f.get("category") == "contrast":
            ids = {m["id"]: m for s in data.values() for m in s["measurements"]}
            m = ids.get(f.get("measurement"))
            if not m:
                problems.append("contrast finding needs a measurement id from eyes.py measure")
            elif m.get("contrast_ratio") is None:
                problems.append(f"measurement {m['id']} found only one colour")
            else:
                need = 3.0 if f.get("contrast_target") in ("large_text", "ui_component") else 4.5
                if m["contrast_ratio"] >= need:
                    problems.append(f"measured {m['contrast_ratio']}:1 meets the {need}:1 target")
                f["measured"] = {"ratio": m["contrast_ratio"], "foreground": m["foreground"], "background": m["background"], "target": need}
        if f.get("category") == "contradiction":
            # Two claims that clash can sit on different screens or on one screen (two prices on the same page),
            # but they must be two separate places: different steps, or boxes on the same step that don't overlap.
            def apart(a, b):
                if (a.get("session"), a.get("step")) != (b.get("session"), b.get("step")):
                    return True
                if not all(isinstance(x.get("box"), list) and len(x["box"]) == 4 for x in (a, b)):
                    return False
                (ax, ay, aw, ah), (bx, by, bw, bh) = a["box"], b["box"]
                ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
                iy = max(0, min(ay + ah, by + bh) - max(ay, by))
                return ix * iy < 0.5 * min(aw * ah, bw * bh)
            separate = any(apart(a, b) for i, a in enumerate(evidence) for b in evidence[i + 1:])
            if not separate or len(f.get("conflict") or []) < 2:
                problems.append("a contradiction needs two evidence spots, on different steps or in separate boxes on one "
                                "step, and a conflict list stating both claims")
        if f.get("category") == "bottleneck" and f.get("page") not in pages:
            problems.append("a bottleneck must name a page from flows.json")
        # How many walks had the chance to hit this, and how many did: a finding hit by 1 of 4 walks that reached
        # the page is weaker than one hit by 4 of 4, whatever its severity. Repeat walks of a persona count separately.
        fpages = {f.get("page")} | {page_of(st["address_bar"]) for e in evidence for s in [data.get(e.get("session"))] if s
                                     for st in s["journey"]["steps"] if st["step"] == e.get("step")}
        fpages.discard(None)
        reached = sorted(n for n, s in data.items() if any(page_of(st["address_bar"]) in fpages for st in s["journey"].get("steps", [])))
        named = {slug_id(p) for p in f.get("personas", [])}
        hit = sorted({e.get("session") for e in evidence if e.get("session") in data}
                     | {n for n in reached if slug_id(data[n]["journey"]["persona"].get("id", "")) in named})
        f["exposure"] = {"pages": sorted(fpages), "walks_reached": len(reached), "walks_hit": len(hit), "hit": hit,
                         "missed": [n for n in reached if n not in hit]}
        if problems:
            removed.append({"id": f.get("id"), "title": f.get("title"), "reasons": problems})
        else:
            if notes:
                f["verification_notes"] = notes
            kept.append(f)
    kept.sort(key=lambda f: SEV_ORDER.index(f["severity"]))
    # A serious finding that one walk produced could be a fluke of that walk. Walking the same persona again
    # is the cheapest way to tell; list who to walk again, most serious first.
    rewalk = {}
    for f in kept:
        ex = f.get("exposure", {})
        if f["severity"] in ("critical", "high") and ex.get("walks_hit") == 1:
            pid = data[ex["hit"][0]]["journey"]["persona"].get("id") if ex.get("hit") and ex["hit"][0] in data else None
            if pid:
                rewalk.setdefault(pid, []).append(f.get("id"))
    rewalk = [{"persona": p, "findings": ids} for p, ids in rewalk.items()]
    (study_dir / "verified_findings.json").write_text(json.dumps({"kept": kept, "removed": removed, "rewalk": rewalk},
                                                                 indent=2, ensure_ascii=False), encoding="utf-8")
    out = {"kept": len(kept), "removed": removed}
    if rewalk:
        out["rewalk"] = rewalk
        out["note"] = "These serious findings each rest on one walk. Walking the persona again tells a pattern from a fluke."
    print(json.dumps(out, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------- render

def esc(x) -> str:
    return html.escape(str(x if x is not None else ""))


def click_heatmaps(study_dir: Path, data: dict, limit: int = 12) -> list:
    """Every persona's clicks drawn on one screen per view: red where nothing happened, blue where the screen changed.
    A click belongs only to the view it was made on, so views are grouped by how they look, not just by page."""
    from PIL import Image, ImageChops, ImageDraw

    def thumb(path):
        im = Image.open(path).convert("L")
        return im.resize((max(1, im.width // 8), max(1, im.height // 8)))

    groups = []  # {page, size, base, thumb, clicks: [(x, y, dead, persona)]}
    for name, s in data.items():
        for st in s["journey"].get("steps", []):
            a = st["action"]
            if a.get("type") not in CLICKS or "x" not in a:
                continue
            shot = s["dir"] / "shots" / st["screenshot"]
            if not shot.exists():
                continue
            page, size, t = page_of(st["address_bar"]), tuple(st["image_size"]), thumb(shot)
            home = None
            for g in groups:
                if g["page"] == page and g["size"] == size:
                    diff = ImageChops.difference(g["thumb"], t).point(lambda v: 255 if v > 16 else 0)
                    if diff.histogram()[255] < 0.03 * t.width * t.height:
                        home = g
                        break
            if home is None:
                home = {"page": page, "size": size, "base": shot, "thumb": t, "clicks": []}
                groups.append(home)
            res = st["result"]
            kind = "blank" if res.get("on_blank_space") else "dead" if res.get("no_visible_response") else "live"
            home["clicks"].append((a["x"], a["y"], kind, name))

    groups.sort(key=lambda g: (-len(g["clicks"]), g["page"]))
    out_dir = study_dir / "heatmaps"
    out_dir.mkdir(exist_ok=True)
    maps = []
    for i, g in enumerate(groups[:limit], 1):
        img = Image.open(g["base"]).convert("RGB")
        over = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(over)
        r = max(10, img.width // 70)
        for x, y, dead, _ in g["clicks"]:
            colour = {"dead": (220, 30, 40), "blank": (130, 130, 130)}.get(dead, (40, 110, 230))
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour + (90,), outline=colour + (255,), width=3)
        img = Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")
        if img.width > 900:
            img = img.resize((900, round(img.height * 900 / img.width)))
        path = out_dir / f"view-{i}.jpg"
        img.save(path, quality=80)
        maps.append({"page": g["page"], "image": path, "clicks": len(g["clicks"]),
                     "dead": sum(c[2] == "dead" for c in g["clicks"]), "personas": sorted({c[3] for c in g["clicks"]})})
    return maps


def replay_data(data: dict) -> dict:
    """Each walk as small screens with the click spot and the persona's words, for the step-through player."""
    from PIL import Image

    walks = {}
    for name, s in data.items():
        frames = []
        for st in s["journey"].get("steps", []):
            shot = s["dir"] / "shots" / st["screenshot"]
            if not shot.exists():
                continue
            im = Image.open(shot).convert("RGB")
            w0, h0 = im.size
            im.thumbnail((640, 900))
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=55, method=4)
            d, a, r = st["decision"], st["action"], st["result"]
            spot = None
            if a.get("type") in CLICKS + ("hover",) and "x" in a:
                spot = [round(100 * a["x"] / w0, 2), round(100 * a["y"] / h0, 2)]
            did = a.get("type", "")
            if did == "finish":
                did = f"finished: {a.get('outcome', '')}"
            elif did == "scroll":
                did = f"scrolled {a.get('direction', 'down')}"
            elif did == "type":
                did = "typed" + (f" \"{a.get('text')}\"" if a.get("text") else "")
            frames.append({
                "img": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
                # The walkthrough shows the address exactly as the address bar had it, query and anchor included,
                # so a reader can open the same screen. Everything else groups by the trimmed page.
                "step": st["step"], "page": page_of(st["address_bar"]), "url": st["address_bar"], "did": did, "spot": spot,
                "dead": bool(r.get("no_visible_response")) and not r.get("on_blank_space"),
                "blank": bool(r.get("on_blank_space")), "blocked": r.get("blocked"),
                "thought": d.get("thought", ""), "scores": [d.get("clarity"), d.get("trust"), d.get("effort")],
                "friction": [f"{f.get('type')} ({f.get('severity')}): {f.get('note', '')}" for f in d.get("friction", [])],
            })
        if frames:
            walks[name] = {"name": s["journey"]["persona"].get("name") or name, "outcome": s["journey"].get("outcome"), "frames": frames}
    return walks


REPLAY_JS = """
(function(){var W=JSON.parse(document.getElementById('walks').textContent),sel=document.getElementById('rp-who'),
img=document.getElementById('rp-img'),dot=document.getElementById('rp-dot'),cap=document.getElementById('rp-cap'),
pos=document.getElementById('rp-pos'),i=0,cur=null;
Object.keys(W).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=W[k].name+' \\u2014 '+W[k].outcome;sel.appendChild(o);});
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function show(){var f=cur.frames[i];img.src=f.img;img.alt='Step '+f.step+' on '+f.page;
 if(f.spot){dot.style.display='block';dot.style.left=f.spot[0]+'%';dot.style.top=f.spot[1]+'%';dot.className=f.dead?'rp-dot dead':'rp-dot';}else dot.style.display='none';
 pos.textContent='Step '+f.step+' of '+cur.frames.length;
 var at=/^https?:/i.test(f.url||'')?'<a class=\"url\" href=\"'+esc(f.url)+'\" rel=\"noopener noreferrer\"><b>'+esc(f.url)+'</b></a>':'<b class=\"url\">'+esc(f.url||f.page)+'</b>';
 cap.innerHTML=at+' \\u00b7 '+esc(f.did)+(f.dead?' \\u00b7 <span class=\"fail\">nothing visible happened</span>':'')+(f.blank?' \\u00b7 clicked empty space':'')+(f.blocked?' \\u00b7 refused by the test driver':'')+
 '<br>\\u201c'+esc(f.thought)+'\\u201d<br><span class=\"muted\">clarity '+f.scores[0]+' \\u00b7 trust '+f.scores[1]+' \\u00b7 effort '+f.scores[2]+'</span>'+
 (f.friction.length?'<ul>'+f.friction.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'');}
function pick(){cur=W[sel.value];i=0;show();}
document.getElementById('rp-prev').onclick=function(){if(i>0){i--;show();}};
document.getElementById('rp-next').onclick=function(){if(i<cur.frames.length-1){i++;show();}};
document.getElementById('replay').addEventListener('keydown',function(e){if(e.key==='ArrowLeft')document.getElementById('rp-prev').click();if(e.key==='ArrowRight')document.getElementById('rp-next').click();});
sel.onchange=pick;pick();})();
"""


def img_data(path: Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def render(study_dir: Path) -> int:
    study = load(study_dir / "study.json", {})
    nav = load(study_dir / "navigation.json")
    flows = load(study_dir / "flows.json")
    if nav is None or flows is None:
        raise SystemExit("Run analyze first")
    demo = load(study_dir / "demographics.json", [])
    fb = load(study_dir / "feedback.json", {"summary": {}, "responses": []})
    vf = load(study_dir / "verified_findings.json", {"kept": [], "removed": []})
    ins = load(study_dir / "insights.json", {})
    data = sessions(study_dir)
    measurements = [m for s in data.values() for m in s["measurements"]]
    findings = vf["kept"]
    n = len(nav)
    devices = defaultdict(int)
    for v in nav.values():
        devices[v["device"] or "desktop"] += 1

    css = """:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e6ec;--bg:#fff;--soft:#f5f6f9;--crit:#b3261e;--high:#d9480f;--med:#b7791f;--low:#4a5568;--ok:#2f855a}
@media (prefers-color-scheme:dark){:root{--ink:#e8eaf0;--muted:#a3abbc;--line:#333a48;--bg:#14171d;--soft:#1c2029}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,Segoe UI,Helvetica,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:28px 16px 80px}h1{font-size:28px;margin:0 0 6px}h2{margin:38px 0 10px;font-size:21px;border-bottom:1px solid var(--line);padding-bottom:6px}
.muted{color:var(--muted)}table{border-collapse:collapse;width:100%;font-size:13.5px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:600}.wrap{overflow-x:auto}.chip{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:1px 8px;margin:2px;font-size:12.5px}
.url{overflow-wrap:anywhere;word-break:break-all}a.url{color:inherit}
.sev{font-weight:700;text-transform:uppercase;font-size:11.5px;letter-spacing:.04em}.critical{color:var(--crit)}.high{color:var(--high)}.medium{color:var(--med)}.low{color:var(--low)}
.finding{border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:14px 0}.finding img{max-width:100%;border:1px solid var(--line);border-radius:6px;margin:6px 0}
.rp-dot{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #2e6ee6;background:rgba(46,110,230,.25);display:none}
.rp-dot.dead{border-color:#dc1e28;background:rgba(220,30,40,.25)}button{font:inherit;padding:4px 10px}
@media (max-width:760px){.rp-grid{grid-template-columns:1fr!important}}
.bar{height:12px;background:#3b6fd8;border-radius:3px}.fail{color:var(--crit);font-weight:700}.pass{color:var(--ok)}.headline{font-size:19px;margin:14px 0}"""

    out = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           f"<title>{esc(study.get('product'))} persona crawl</title><style>{css}</style></head><body><main>"]
    out.append(f"<h1>{esc(study.get('product'))}: visual persona crawl</h1>")
    out.append(f"<p class='muted'>Study {esc(study.get('id'))} · {n} simulated personas ({', '.join(f'{v} {k}' for k, v in devices.items())}) · "
               f"mode {esc(study.get('mode'))} · start {esc(study.get('start_url'))}</p>")
    if ins.get("headline"):
        out.append(f"<p class='headline'><b>{esc(ins['headline'])}</b></p>")

    # outcomes
    out.append("<h2>Who went where</h2><div class='wrap'><table><tr><th>Persona</th><th>Device</th><th>Outcome</th><th>Steps</th><th>Est. time</th><th>Path</th></tr>")
    for name, v in nav.items():
        path = " → ".join(f"<span class='chip'>{esc(p['page'])} ×{p['steps']}</span>" for p in v["path"])
        out.append(f"<tr><td><b>{esc(v['persona'].get('name'))}</b><br><span class='muted'>{esc(name)}</span></td><td>{esc(v['device'])}</td>"
                   f"<td>{esc(v['outcome'])}<br><span class='muted'>{esc(v.get('reason'))}</span></td><td>{v['steps_taken']}</td>"
                   f"<td>{round((v.get('est_seconds') or 0) / 60, 1)} min</td><td>{path}</td></tr>")
    out.append("</table></div>")
    if flows["funnel"]:
        out.append("<h3>How far personas got</h3><table>")
        for f in flows["funnel"]:
            out.append(f"<tr><td style='width:28%'>{esc(f['label'])}</td><td><div class='bar' style='width:{100 * f['reached'] / max(f['of'], 1):.0f}%'></div></td>"
                       f"<td style='width:14%'>{f['reached']} of {f['of']}</td></tr>")
        out.append("</table><p class='muted'>Counts of simulated personas, not conversion rates.</p>")
        # swimlanes: who reached which stage, and where each one stopped
        stage_ids = [f["stage"] for f in flows["funnel"]]
        out.append("<h3>Each persona through the stages</h3><div class='wrap'><table><tr><th>Persona</th>"
                   + "".join(f"<th>{esc(f['label'])}</th>" for f in flows["funnel"]) + "</tr>")
        for name, v in nav.items():
            reached = set(v.get("stages_reached", []))
            last = next((s for s in reversed(stage_ids) if s in reached), None)
            cells = []
            for sid in stage_ids:
                if sid == last and v["outcome"] != "reached_goal":
                    cells.append(f"<td class='fail' title='{esc(v.get('reason'))}'>stopped: {esc(v['outcome'])}</td>")
                elif sid in reached:
                    cells.append("<td class='pass'>&#10003;</td>")
                else:
                    cells.append("<td></td>")
            out.append(f"<tr><td><b>{esc(v['persona'].get('name'))}</b></td>{''.join(cells)}</tr>")
        out.append("</table></div>")

    # bottlenecks
    out.append("<h2>Where the flow slows down</h2><div class='wrap'><table><tr><th></th><th>Page</th><th>Visitors</th><th>Steps / visitor</th><th>Dead clicks</th>"
               "<th>Backtracked from</th><th>Left here, short of goal</th><th>Friction reports</th><th>Clarity · trust · effort</th><th>Score</th></tr>")
    for p in flows["pages"]:
        sp = p["score_parts"]
        out.append(f"<tr><td>{p['handle']}</td><td>{esc(p['page'])}</td><td>{p['visitors']}</td><td>{sp['steps_per_visitor']}</td><td>{sp['dead_clicks']}</td>"
                   f"<td>{sp['backtracked_from']}</td><td>{sp['exits_short_of_goal']}</td><td>{p['friction_reports']}</td>"
                   f"<td>{p['avg_clarity']} · {p['avg_trust']} · {p['avg_effort']}</td><td><b>{p['bottleneck_score']}</b></td></tr>")
    out.append(f"</table></div><p class='muted'>Score = {esc(flows['score_formula'])}. Clarity and trust 1 to 5, higher is better; effort 1 to 5, higher is worse.</p>")

    # step-through replay of every walk
    walks = replay_data(data)
    if walks:
        out.append("<h2>Replay each walk</h2><p class='muted'>Step through what each persona saw, where they clicked "
                   "(<span class='fail'>red</span> when nothing happened) and what they thought. Arrow keys work once a button has focus.</p>"
                   "<div id='replay'><p><select id='rp-who' aria-label='Persona'></select> "
                   "<button id='rp-prev' type='button'>&larr; Back</button> <button id='rp-next' type='button'>Next &rarr;</button> "
                   "<span id='rp-pos' class='muted'></span></p>"
                   "<div style='display:grid;grid-template-columns:minmax(0,640px) minmax(0,1fr);gap:16px;align-items:start' class='rp-grid'>"
                   "<div style='position:relative;line-height:0'><img id='rp-img' alt='' style='width:100%;border:1px solid var(--line);border-radius:6px'>"
                   "<span id='rp-dot' class='rp-dot'></span></div><div id='rp-cap'></div></div></div>"
                   "<script type='application/json' id='walks'>" + json.dumps(walks).replace("</", "<\\/") + "</script>"
                   "<script>" + REPLAY_JS + "</script>")

    # where people clicked
    maps = click_heatmaps(study_dir, data)
    if maps:
        out.append("<h2>Where people clicked</h2><p class='muted'>Each picture is one view of a page with every persona's clicks on it: "
                   "<b style='color:#2e6ee6'>blue</b> changed the screen, <b style='color:#dc1e28'>red</b> did nothing visible, grey landed on empty space.</p>"
                   "<div style='display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px'>")
        for m in maps:
            out.append(f"<figure style='margin:0'><img src='{img_data(m['image'])}' alt='Clicks on {esc(m['page'])}' style='max-width:100%;border:1px solid var(--line);border-radius:6px'>"
                       f"<figcaption class='muted'>{esc(m['page'])} · {m['clicks']} clicks, {m['dead']} with no response · {esc(', '.join(m['personas']))}</figcaption></figure>")
        out.append("</div>")

    # findings
    out.append(f"<h2>Findings ({len(findings)})</h2>")
    for f in findings:
        out.append(f"<div class='finding'><span class='sev {f['severity']}'>{f['severity']}</span> · <span class='chip'>{esc(f['category'])}</span> "
                   f"<b>{esc(f.get('id'))}: {esc(f.get('title'))}</b><p>{esc(f.get('description'))}</p>")
        ex = f.get("exposure")
        if ex and ex.get("walks_reached"):
            out.append(f"<p class='muted'>Hit in {ex['walks_hit']} of {ex['walks_reached']} walks that reached "
                       f"{esc(', '.join(ex['pages']))}" + (f"; not by {esc(', '.join(ex['missed']))}" if ex.get("missed") else "") + ".</p>")
        if f.get("conflict"):
            out.append("<p><b>Says one thing:</b> " + esc(f["conflict"][0]) + "<br><b>…and another:</b> " + esc(f["conflict"][1]) + "</p>")
        if f.get("measured"):
            m = f["measured"]
            out.append(f"<p>Measured <span class='fail'>{m['ratio']}:1</span> ({esc(m['foreground'])} on {esc(m['background'])}), target {m['target']}:1 · {esc(f.get('measurement'))}</p>")
        for e in f.get("evidence", []):
            crop = study_dir / e.get("crop", "")
            if e.get("crop") and crop.exists():
                out.append(f"<figure style='margin:8px 0'><img alt='{esc(f.get('title'))}' src='{img_data(crop)}'>"
                           f"<figcaption class='muted'>{esc(e['session'])}, step {e['step']}{(' · “' + esc(e['quote']) + '”') if e.get('quote') else ''}</figcaption></figure>")
        affected = ", ".join(f.get("personas", []))
        out.append(f"<p><b>Fix:</b> {esc(f.get('recommendation'))}</p><p class='muted'>Affects: {esc(affected)} · confidence {esc(f.get('confidence'))}</p></div>")

    # measurements
    if measurements:
        out.append("<h2>Contrast and size measurements</h2><div class='wrap'><table><tr><th>Id</th><th>What</th><th>Colours</th><th>Ratio</th><th>Body text 4.5</th><th>Large text / UI 3.0</th><th>Size (CSS px)</th></tr>")
        for m in measurements:
            ok = m.get("wcag", {})
            cls = lambda b: "pass" if b else "fail"
            out.append(f"<tr><td>{esc(m['id'])}</td><td>{esc(m.get('what'))}</td><td>{esc(m.get('foreground'))} on {esc(m.get('background'))}</td>"
                       f"<td>{esc(m.get('contrast_ratio'))}</td><td class='{cls(ok.get('body_text_4_5'))}'>{'pass' if ok.get('body_text_4_5') else 'fail'}</td>"
                       f"<td class='{cls(ok.get('large_text_3'))}'>{'pass' if ok.get('large_text_3') else 'fail'}</td><td>{m['size_css_px'][0]}×{m['size_css_px'][1]}</td></tr>")
        out.append("</table></div><p class='muted'>Measured from screenshot pixels with an eyedropper method, not from the page's styles.</p>")

    # demographics
    out.append("<h2>The panel</h2><div class='wrap'><table><tr><th>Persona</th><th>Demographics</th><th>Outcome</th></tr>")
    for r in demo:
        d = "; ".join(f"{k.replace('_', ' ')}: {v if not isinstance(v, list) else ', '.join(map(str, v))}" for k, v in (r.get("demographics") or {}).items())
        out.append(f"<tr><td><b>{esc(r.get('name'))}</b><br><span class='muted'>{esc(r.get('device'))}</span></td><td>{esc(d)}</td><td>{esc(r.get('outcome'))}</td></tr>")
    out.append("</table></div><p class='muted'>Simulated people. Demographics describe who the panel stands in for, not real respondents.</p>")

    # feedback
    s = fb.get("summary") or {}
    out.append("<h2>What they said afterwards</h2>")
    if s:
        rc = s["recommend_counts"]
        out.append(f"<p>{s['responses']} of {s['of']} exit interviews · ease {s['ease_avg_1_7']}/7 · UMUX-Lite {s['umux_lite_avg_0_100']}/100 · "
                   f"satisfaction {s['satisfaction_avg_1_5']}/5 · would recommend 9–10: {rc['9-10']}, 7–8: {rc['7-8']}, 0–6: {rc['0-6']}</p>")
    out.append("<div class='wrap'><table><tr><th>Persona</th><th>In one word</th><th>Worst</th><th>Best</th><th>What would fix it</th><th>In their words</th></tr>")
    for r in fb.get("responses", []):
        out.append(f"<tr><td>{esc(r.get('session'))}</td><td>{esc(r.get('one_word'))}</td><td>{esc(r.get('worst_thing'))}</td><td>{esc(r.get('best_thing'))}</td>"
                   f"<td>{esc(r.get('what_would_fix_it'))}</td><td>“{esc(r.get('quote'))}”</td></tr>")
    out.append("</table></div>")

    for key, title in (("insights", "Patterns across personas"), ("what_works", "What works"), ("research_questions", "Questions to put to real users")):
        if ins.get(key):
            out.append(f"<h2>{title}</h2><ul>" + "".join(f"<li>{esc(x)}</li>" for x in ins[key]) + "</ul>")
    if vf["removed"]:
        out.append("<h2>Removed in verification</h2><ul>" + "".join(f"<li>{esc(r['id'])} {esc(r['title'])}: {esc('; '.join(r['reasons']))}</li>" for r in vf["removed"]) + "</ul>")
    out.append("<h2>Limits</h2><ul><li>These are simulated personas looking at screenshots. They show where to look, not how many real customers would struggle; counts are not rates.</li>"
               "<li>Personas saw only pixels and the address bar: no page text, markup or accessibility tree. Screen-reader experience was not tested.</li>"
               "<li>Contrast was measured from rendered pixels; anti-aliasing can shift a ratio slightly near a threshold.</li>"
               "<li>Time estimates are the personas' own estimates per screen, not measured time on task.</li></ul></main></body></html>")
    (study_dir / "report.html").write_text("\n".join(out), encoding="utf-8")

    md = [f"# {study.get('product')}: visual persona crawl", "", f"Study {study.get('id')} · {n} simulated personas · mode {study.get('mode')}", ""]
    if ins.get("headline"):
        md += [f"**{ins['headline']}**", ""]
    md += ["## Outcomes", "", "| Persona | Device | Outcome | Steps | Path |", "|---|---|---|---|---|"]
    md += [f"| {v['persona'].get('name')} | {v['device']} | {v['outcome']} | {v['steps_taken']} | {' → '.join(p['page'] for p in v['path'])} |" for v in nav.values()]
    md += ["", "## Bottlenecks", "", "| | Page | Score | Dead clicks | Backtracked from | Left short of goal |", "|---|---|---|---|---|---|"]
    md += [f"| {p['handle']} | {p['page']} | {p['bottleneck_score']} | {p['score_parts']['dead_clicks']} | {p['score_parts']['backtracked_from']} | {p['score_parts']['exits_short_of_goal']} |" for p in flows["pages"][:6]]
    md += ["", "## Findings", ""]
    for f in findings:
        md.append(f"- **{f['id']}** [{f['severity']} · {f['category']}] {f['title']}: {f.get('recommendation', '')}")
    md += ["", 'Ask "show me F1" or "how do you know a real person would struggle here?" to see the screens, steps and measurements behind any finding.']
    (study_dir / "report.md").write_text("\n".join(md), encoding="utf-8")
    print(json.dumps({"report": shown(study_dir / "report.html"), "findings": len(findings), "removed": len(vf["removed"])}))
    return 0


def export(study_dir: Path) -> int:
    """Verified findings as one Markdown ticket each (issues/F1.md ...) and a findings.csv, for an issue tracker or a sheet."""
    import csv

    vf = load(study_dir / "verified_findings.json")
    if vf is None:
        raise SystemExit("Run verify first")
    study = load(study_dir / "study.json", {})
    ins = load(study_dir / "insights.json", {})
    out_dir = study_dir / "issues"
    out_dir.mkdir(exist_ok=True)
    rows = []
    for f in vf["kept"]:
        fid = f.get("id", "F?")
        lines = [f"# {fid}: {f.get('title', '')}", "",
                 f"**Severity:** {f.get('severity')} · **Category:** {f.get('category')} · **Page:** `{f.get('page', '')}` · "
                 f"**Confidence:** {f.get('confidence', '')}", "",
                 f"**Seen by simulated personas:** {', '.join(f.get('personas', []))}"
                 + (f" (hit in {f['exposure']['walks_hit']} of {f['exposure']['walks_reached']} walks that reached the page)"
                    if (f.get("exposure") or {}).get("walks_reached") else ""), "",
                 "## What happens", "", str(f.get("description", "")), ""]
        if f.get("conflict"):
            lines += ["## The two statements", ""] + [f"- {c}" for c in f["conflict"]] + [""]
        if f.get("measurement"):
            lines += ["## Measured", "", f"Measurement `{f['measurement']}`, target `{f.get('contrast_target', '')}`.", ""]
        lines += ["## Evidence", ""]
        for e in f.get("evidence", []):
            where = f"session `{e.get('session')}`, step {e.get('step')}, box {e.get('box')}"
            quote = f' — "{e["quote"]}"' if e.get("quote") else ""
            pic = f"\n\n  ![{fid} evidence](../{e['crop']})" if e.get("crop") else ""
            lines.append(f"- {where}{quote}{pic}")
        lines += ["", "## Suggested fix", "", str(f.get("recommendation", "")), "",
                  f"_From a simulated persona study ({study.get('id')}, {study.get('product')}). "
                  "It shows where to look, not how many real customers are affected._", ""]
        (out_dir / f"{fid}.md").write_text("\n".join(lines), encoding="utf-8")
        rows.append({"id": fid, "title": f.get("title"), "severity": f.get("severity"), "category": f.get("category"),
                     "page": f.get("page"), "personas": "; ".join(f.get("personas", [])),
                     "recommendation": f.get("recommendation"), "measurement": f.get("measurement", ""),
                     "walks_hit": (f.get("exposure") or {}).get("walks_hit", ""),
                     "walks_reached": (f.get("exposure") or {}).get("walks_reached", ""),
                     "evidence": "; ".join(f"{e.get('session')}#{e.get('step')}" for e in f.get("evidence", [])),
                     "ticket": f"issues/{fid}.md"})
    with (study_dir / "findings.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]) if rows else ["id"])
        w.writeheader()
        w.writerows(rows)
    if ins.get("research_questions"):
        (out_dir / "research-questions.md").write_text(
            "# Questions to test with real users\n\n" + "\n".join(f"- {q}" for q in ins["research_questions"]) + "\n",
            encoding="utf-8")
    print(json.dumps({"tickets": len(rows), "folder": shown(out_dir), "csv": shown(study_dir / "findings.csv")}))
    return 0


def _words(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9$]+", str(text).lower()) if len(w) > 2}


def compare(study_dir: Path, baseline: Path, versus: bool = False) -> int:
    """The same panel before and after a change: outcomes, funnel, page scores, and which findings are fixed, remain or are new.
    With versus, the same panel on two different sites (say, ours and a competitor's): pages can't match across
    sites, so findings match by category within the same funnel stage instead."""
    need = ("navigation.json", "flows.json", "verified_findings.json")
    for d in (study_dir, baseline):
        missing = [n for n in need if not (d / n).exists()]
        if missing:
            raise SystemExit(f"{shown(d)} is missing {missing}: run analyze and verify there first")
    old_nav, new_nav = load(baseline / "navigation.json"), load(study_dir / "navigation.json")
    old_flows, new_flows = load(baseline / "flows.json"), load(study_dir / "flows.json")
    old_f, new_f = load(baseline / "verified_findings.json")["kept"], load(study_dir / "verified_findings.json")["kept"]

    by_persona = lambda nav: {v["persona"]["id"]: v for v in nav.values()}
    po, pn = by_persona(old_nav), by_persona(new_nav)
    people = [{"persona": pid, "before": po.get(pid, {}).get("outcome"), "after": pn.get(pid, {}).get("outcome"),
               "steps_before": po.get(pid, {}).get("steps_taken"), "steps_after": pn.get(pid, {}).get("steps_taken")}
              for pid in sorted(set(po) | set(pn))]
    same_panel = set(po) == set(pn)

    fo = {f["stage"]: f for f in old_flows.get("funnel", [])}
    old_list = old_flows.get("funnel", [])
    # Two sites usually get the same stage ids ("plans", "signup") for the same step of the task. If they don't,
    # line the stages up by position.
    by_id = any(f["stage"] in fo for f in new_flows.get("funnel", []))
    funnel = [{"stage": f["stage"], "label": f["label"],
               "before": (fo.get(f["stage"], {}) if by_id else (old_list[i] if i < len(old_list) else {})).get("reached"),
               "after": f["reached"], "of": f["of"]}
              for i, f in enumerate(new_flows.get("funnel", []))]
    so = {p["page"]: p["bottleneck_score"] for p in old_flows["pages"]}
    sn = {p["page"]: p["bottleneck_score"] for p in new_flows["pages"]}
    pages = sorted(({"page": pg, "before": so.get(pg), "after": sn.get(pg)} for pg in set(so) | set(sn)),
                   key=lambda r: -max(r["before"] or 0, r["after"] or 0))

    def quotes(f):
        return {norm(q) for q in [e.get("quote") for e in f.get("evidence", [])] + list(f.get("conflict") or []) if q and len(norm(q)) > 3}

    def stage_finder(d):
        st = load(d / "study.json", {}) or {}
        urls = {}
        for v in load(d / "navigation.json", {}).values():
            for step in v.get("steps", []):
                if step.get("address_after"):
                    urls.setdefault(page_of(step["address_after"]), step["address_after"])

        def find(page):
            if not page:
                return None
            PAGE_URLS.clear()
            PAGE_URLS.update(urls)
            return stage_of(st, page)
        return find
    new_stage, old_stage = stage_finder(study_dir), stage_finder(baseline)
    stage = {id(f): new_stage(f.get("page")) for f in new_f}
    stage.update({id(f): old_stage(f.get("page")) for f in old_f})

    def same(a, b):
        if versus:
            # Two sites never share a page; the same kind of problem at the same step of the task is the match.
            same_page = bool(stage[id(a)]) and stage[id(a)] == stage[id(b)]
        else:
            same_page = bool(a.get("page")) and a.get("page") == b.get("page")
        if same_page and a.get("category") == b.get("category"):
            return True
        if same_page and quotes(a) & quotes(b):  # two wordings of one problem usually quote the same words on screen
            return True
        wa, wb = _words(a.get("title")), _words(b.get("title"))
        return bool(wa and wb) and len(wa & wb) / len(wa | wb) >= 0.35

    here, there = (study_dir.name, baseline.name) if versus else ("after", "before")
    STATUS = ("on both sites", f"only on {here}", f"only on {there}") if versus else ("still there", "new", "not seen again")
    used, rows = set(), []
    for f in new_f:
        # Prefer an old finding not yet matched; one old finding may still match two new ones when a run splits it.
        match = next((o for i, o in enumerate(old_f) if i not in used and same(f, o)), None) \
            or next((o for o in old_f if same(f, o)), None)
        if match is not None:
            used.add(old_f.index(match))
            rows.append({"status": STATUS[0], "after": f.get("id"), "before": match.get("id"), "title": f.get("title"),
                         "severity_before": match.get("severity"), "severity_after": f.get("severity")})
        else:
            rows.append({"status": STATUS[1], "after": f.get("id"), "before": None, "title": f.get("title"), "severity_after": f.get("severity")})
    for i, o in enumerate(old_f):
        if i not in used:
            rows.append({"status": STATUS[2], "after": None, "before": o.get("id"), "title": o.get("title"), "severity_before": o.get("severity")})

    caveat = ("Simulated personas vary from run to run. 'Not seen again' means no persona hit it this time, not that it is fixed; "
              "check the screen itself before closing it.")
    if versus:
        caveat = ("Simulated personas vary from run to run, and the two sites were walked separately. A finding on only one site "
                  "means no persona hit it on the other this time, not that the other site is free of it.")
    if versus:
        pages = [{"site": site, "page": pg, "score": v} for site, sc in ((baseline.name, so), (study_dir.name, sn))
                 for pg, v in sorted(sc.items(), key=lambda kv: -kv[1])[:5]]
    result = {"mode": "versus" if versus else "before_after", "baseline": shown(baseline), "study": shown(study_dir),
              "same_panel": same_panel, "personas": people, "funnel": funnel, "pages": pages, "findings": rows, "caveat": caveat}
    (study_dir / "compare.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    TITLE = "Side by side" if versus else "Before and after"
    B, A = (baseline.name, study_dir.name) if versus else ("Before", "After")
    h = ["<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
         "<title>" + TITLE + "</title><style>:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e6ec;--bg:#fff}"
         "@media (prefers-color-scheme:dark){:root{--ink:#e8eaf0;--muted:#a3abbc;--line:#333a48;--bg:#14171d}}"
         "body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,Segoe UI,Arial,sans-serif}"
         "main{max-width:1000px;margin:0 auto;padding:28px 16px 60px}table{border-collapse:collapse;width:100%;font-size:14px}"
         "td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left}.muted{color:var(--muted)}.wrap{overflow-x:auto}"
         ".up{color:#2f855a;font-weight:600}.down{color:#b3261e;font-weight:600}</style></head><body><main>",
         f"<h1>{TITLE}</h1>",
         f"<p class='muted'>{'Other site' if versus else 'Baseline'} {esc(baseline.name)} · this run {esc(study_dir.name)}</p>"]
    if not same_panel:
        h.append("<p class='down'>The two runs used different personas, so differences may come from the panel, not the site.</p>")
    h.append(f"<h2>Findings</h2><div class='wrap'><table><tr><th>Status</th><th>{esc(B)}</th><th>{esc(A)}</th><th>Finding</th><th>Severity</th></tr>")
    for r in sorted(rows, key=lambda r: [STATUS[1], STATUS[0], STATUS[2]].index(r["status"])):
        sev = " → ".join(x for x in (r.get("severity_before"), r.get("severity_after")) if x)
        cls = "" if versus else "down" if r["status"] == STATUS[1] else "up" if r["status"] == STATUS[2] else ""
        h.append(f"<tr><td class='{cls}'>{esc(r['status'])}</td><td>{esc(r['before'] or '')}</td><td>{esc(r['after'] or '')}</td>"
                 f"<td>{esc(r['title'])}</td><td>{esc(sev)}</td></tr>")
    h.append("</table></div><h2>Outcomes</h2><div class='wrap'><table><tr><th>Persona</th><th>" + esc(B) + "</th><th>" + esc(A) + "</th><th>Steps</th></tr>")
    for p in people:
        h.append(f"<tr><td>{esc(p['persona'])}</td><td>{esc(p['before'])}</td><td>{esc(p['after'])}</td>"
                 f"<td>{esc(p['steps_before'])} → {esc(p['steps_after'])}</td></tr>")
    if funnel:
        h.append("</table></div><h2>How far they got</h2><div class='wrap'><table><tr><th>Stage</th><th>" + esc(B) + "</th><th>" + esc(A) + "</th></tr>")
        for f in funnel:
            b, a = f["before"] or 0, f["after"] or 0
            cls = "" if versus else "up" if a > b else "down" if a < b else ""
            h.append(f"<tr><td>{esc(f['label'])}</td><td>{b} of {f['of']}</td><td class='{cls}'>{a} of {f['of']}</td></tr>")
    if versus:
        # No page is on both sites: show each site's worst pages on their own.
        h.append("</table></div><h2>Worst pages</h2><p class='muted'>Bottleneck score; lower is better.</p><div class='wrap'><table><tr><th>Site</th><th>Page</th><th>Score</th></tr>")
        for p in pages:
            h.append(f"<tr><td>{esc(p['site'])}</td><td>{esc(p['page'])}</td><td>{p['score']}</td></tr>")
    else:
        h.append("</table></div><h2>Page scores</h2><p class='muted'>Bottleneck score; lower is better.</p><div class='wrap'><table><tr><th>Page</th><th>Before</th><th>After</th></tr>")
    for p in ([] if versus else pages[:12]):
        b, a = p["before"], p["after"]
        cls = "up" if (a is not None and b is not None and a < b) else "down" if (a is not None and b is not None and a > b) else ""
        h.append(f"<tr><td>{esc(p['page'])}</td><td>{'' if b is None else b}</td><td class='{cls}'>{'' if a is None else a}</td></tr>")
    h.append(f"</table></div><p class='muted'>{esc(result['caveat'])} Persona counts are not rates.</p></main></body></html>")
    (study_dir / "compare.html").write_text("\n".join(h), encoding="utf-8")
    counts = {s: sum(r["status"] == s for r in rows) for s in STATUS}
    print(json.dumps({"same_panel": same_panel, **counts, "report": shown(study_dir / "compare.html")}))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["analyze", "verify", "render", "export", "compare"])
    ap.add_argument("--study-dir", required=True)
    ap.add_argument("--baseline", help="compare: an earlier study folder to compare this one against")
    ap.add_argument("--versus", action="store_true", help="compare: the baseline is another site walked by the same panel")
    args = ap.parse_args()
    d = lp(args.study_dir)
    if args.cmd == "analyze":
        analyze(d)
        return 0
    if args.cmd == "compare":
        if not args.baseline:
            raise SystemExit("compare needs --baseline <earlier study folder>")
        return compare(d, lp(args.baseline), versus=args.versus)
    if args.cmd == "export":
        return export(d)
    return verify(d) if args.cmd == "verify" else render(d)


if __name__ == "__main__":
    sys.exit(main())
